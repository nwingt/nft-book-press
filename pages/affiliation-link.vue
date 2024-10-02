<template>
  <PageContainer>
    <PageHeader title="Generate Affiliation Links" />

    <PageBody class="flex flex-col items-stretch grow space-y-4">
      <UCard
        v-if="!productData && productData !== null"
        :ui="{ body: { base: 'space-y-4' }, footer: { base: 'flex justify-end' } }"
      >
        <UFormGroup label="Destination">
          <USelect v-model="destinationSetting" :options="destinationSettings" option-attribute="name" />
        </UFormGroup>

        <UFormGroup
          v-if="isUsingCustomDestination"
          label="Custom Page URL"
          :required="true"
        >
          <UInput
            v-model="customDestinationURLInput"
            class="font-mono"
            placeholder="https://books.liker.land"
            name="custom_destination_url"
          />
        </UFormGroup>

        <UFormGroup
          v-else
          label="Product ID/URL"
          :error="productIdError"
          :required="true"
        >
          <UInput
            v-model="productIdInputModel"
            class="font-mono"
            placeholder="https://liker.land/nft/class/likenft1ku4ra0e7dgknhd0wckrkxspuultynl4mgkxa3j08xeshfr2l0ujqmmvy83"
            name="product_id"
          />
        </UFormGroup>

        <UFormGroup
          label="Channel ID(s)"
          hint="Optional"
          :error="customChannelInputError"
        >
          <div class="flex gap-2">
            <UInput
              v-model="customChannelInput"
              class="grow font-mono"
              placeholder="Channel ID(s), separated by commas (e.g. @store01, @store02)"
              name="channel_ids"
            />
            <UButton
              v-show="!customChannelInput && userLikerInfo"
              class="relative"
              label="Prefill from Account"
              color="gray"
              variant="outline"
              size="2xs"
              @click="prefillChannelIdIfPossible"
            />
          </div>
        </UFormGroup>

        <UAccordion
          color="gray"
          variant="soft"
          size="md"
          :items="[{
            label: 'Query String (Optional)',
            defaultOpen: true,
            slot: 'body'
          }]"
          :ui="{ item: { padding: 'p-0' } }"
        >
          <template #body>
            <UCard :ui="{ body: { base: 'space-y-4' } }">
              <div class="relative flex max-md:flex-col flex-wrap gap-4">
                <UFormGroup class="flex-1" label="UTM Campaign">
                  <UInput
                    v-model="utmCampaignInput"
                    class="font-mono"
                    name="utm_campaign"
                    :placeholder="`e.g. ${utmCampaignDefault}`"
                  />
                </UFormGroup>
                <UFormGroup class="flex-1" label="UTM Source">
                  <UInput
                    v-model="utmSourceInput"
                    class="font-mono"
                    name="utm_source"
                    :placeholder="`e.g. ${utmSourceDefault}`"
                  />
                </UFormGroup>
                <UFormGroup class="flex-1" label="UTM Medium">
                  <UInput
                    v-model="utmMediumInput"
                    class="font-mono"
                    name="utm_medium"
                    :placeholder="`e.g. ${utmMediumDefault}`"
                  />
                </UFormGroup>
              </div>

              <UFormGroup label="Additional Query String">
                <UInput
                  v-model="additionalQueryStringInput"
                  class="font-mono"
                  :placeholder="additionalQueryStringInputPlaceholder"
                  name="query_params"
                />
              </UFormGroup>

              <div class="flex items-center gap-2">
                <UToggle v-model="shouldPrefixChannelIdForUTMCampaign" />
                <span v-text="'Prefix Channel ID for UTM Campaign'" />
              </div>
            </UCard>
          </template>
        </UAccordion>

        <template #footer>
          <UButton
            label="Generate"
            size="lg"
            :disabled="!canCreateAffiliationLink"
            :loading="isCreatingAffiliationLinks"
            @click="createAffiliationLink"
          />
        </template>
      </UCard>

      <template v-else>
        <header>
          <UButton
            icon="i-heroicons-arrow-uturn-left"
            label="Back to configuration"
            variant="soft"
            @click="productData = undefined"
          />
        </header>

        <template v-if="commonQueryStringTableRows.length">
          <h3 class="text-lg font-bold" v-text="'Common Query String'" />

          <UCard :ui="{ body: { padding: '' } }">
            <UTable
              :columns="[
                { key: 'key', label: 'Key' },
                { key: 'value', label: 'Value' }
              ]"
              :rows="commonQueryStringTableRows"
              :ui="{ td: { font: 'font-mono' } }"
            />
          </UCard>
        </template>

        <h3 class="pt-4 text-lg font-bold" v-text="'Affiliation Links'" />

        <ul>
          <li>
            <AffiliationLinkTable
              :product-data="productData"
              :product-id="productId"
              :custom-channels="customChannels"
              :is-using-custom-destination="isUsingCustomDestination"
              :custom-destination-url="customDestinationURLInput"
              :should-prefix-channel-id-for-utm-campaign="shouldPrefixChannelIdForUTMCampaign"
              :merged-query-string-object="mergedQueryStringObject"
              :destination-setting="destinationSetting"
            />
          </li>
        </ul>
      </template>
    </PageBody>
  </PageContainer>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useCollectionStore } from '~/stores/collection'
import { useLikerStore } from '~/stores/liker'
import { useStripeStore } from '~/stores/stripe'
import { useUserStore } from '~/stores/user'

const { LIKE_CO_API } = useRuntimeConfig().public
const collectionStore = useCollectionStore()
const likerStore = useLikerStore()
const stripeStore = useStripeStore()
const userStore = useUserStore()
const { userLikerInfo } = storeToRefs(userStore)
const route = useRoute()
const toast = useToast()

const productIdInputModelValue = ref('')
const productIdInputModel = computed<string>({
  get: () => {
    if (productIdInputModelValue.value) {
      return productIdInputModelValue.value
    }
    const productIdQs = route.query.product_id
    if (productIdQs) {
      if (Array.isArray(productIdQs)) {
        return productIdQs.join(',')
      }
      return productIdQs
    }
    return ''
  },
  set: (value: string) => {
    productIdInputModelValue.value = value
  }
})

const productIdInputs = computed(() => {
  return productIdInputModel.value.split(',')
    .map(input => input.trim())
    .filter(Boolean)
})
const productIdInput = computed(() => {
  return productIdInputs.value[0] || ''
})

const productIds = computed(() => {
  return productIdInputs.value.map((input) => {
    if (input.startsWith('http')) {
      const url = new URL(input)
      const id = url.pathname.split('/').pop()
      if (id?.startsWith('col_') || id?.startsWith('likenft')) {
        return id
      }
    }
    return input
  })
})
const productId = computed(() => {
  return productIds.value[0] || ''
})

function constructUTMQueryString (input: {
  utmCampaign?: string,
  utmSource?: string,
  utmMedium?: string
} = {}) {
  const searchParams = new URLSearchParams()
  if (input.utmCampaign) {
    searchParams.set('utm_campaign', input.utmCampaign)
  }
  if (input.utmSource) {
    searchParams.set('utm_source', input.utmSource)
  }
  if (input.utmMedium) {
    searchParams.set('utm_medium', input.utmMedium)
  }
  return searchParams.toString().replace('?', '')
}

const utmCampaignInput = ref('')
const utmCampaignDefault = 'bookpress'
const shouldPrefixChannelIdForUTMCampaign = ref(true)

const utmMediumInput = ref('')
const utmMediumDefault = 'affiliate'

const utmSourceInput = ref('')
const utmSourceDefault = computed(() => {
  const isUseLikerLandLink = destinationSetting.value === 'liker_land'
  if (isUsingCustomDestination.value) {
    return 'custom-link'
  }
  return isUseLikerLandLink ? 'likerland' : 'stripe'
})

const linkQueryInputModel = ref('')
const additionalQueryStringInput = computed({
  get: () => {
    if (linkQueryInputModel.value) {
      return linkQueryInputModel.value
    }
    return constructUTMQueryString({
      utmCampaign: utmCampaignInput.value,
      utmSource: utmSourceInput.value,
      utmMedium: utmMediumInput.value
    })
  },
  set: (value) => {
    linkQueryInputModel.value = value
  }
})

const additionalQueryStringInputPlaceholder = computed(() => {
  return constructUTMQueryString({
    utmCampaign: utmCampaignDefault,
    utmSource: utmSourceDefault.value,
    utmMedium: utmMediumDefault
  })
})

const linkQueryDefault = computed(() => {
  return {
    utm_medium: utmMediumDefault,
    utm_source: utmSourceDefault.value,
    utm_campaign: utmCampaignDefault
  }
})
const mergedQueryStringObject = computed<Record<string, string>>(() => {
  const mergedObject = { ...linkQueryDefault.value }

  const input = productIdInput.value?.trim() || ''
  if (input.startsWith('http')) {
    Object.assign(mergedObject, Object.fromEntries(new URL(input).searchParams))
  }

  if (additionalQueryStringInput.value) {
    Object.assign(mergedObject, Object.fromEntries(new URLSearchParams(additionalQueryStringInput.value)))
  }

  return mergedObject
})
const commonQueryStringTableRows = computed(() => {
  return Object.entries(mergedQueryStringObject.value)
    .filter(([key]) => !(key === 'utm_campaign' && shouldPrefixChannelIdForUTMCampaign.value))
    .map(([key, value]) => ({
      key,
      value
    }))
})

const destinationSettings = ref([
  {
    name: 'Liker Land Product Page',
    value: 'liker_land'
  },
  {
    name: 'Stripe Checkout Page',
    value: 'direct'
  },
  {
    name: 'Custom Page',
    value: 'custom'
  }
])
const destinationSetting = ref(destinationSettings.value[0].value)
const isUsingCustomDestination = computed(() => destinationSetting.value === 'custom')
const customDestinationURLInput = ref(route.query.custom_link as string || '')

const customChannelInput = ref('')
const customChannels = computed(
  () => customChannelInput.value
    .split(',')
    .map(channelId => channelId.trim())
    .filter(Boolean)
    .map((channelId) => {
      const channelInfo = likerStore.getChannelInfoById(channelId)
      return {
        id: channelId,
        name: channelInfo?.displayName || channelId
      }
    })
)

const productIdError = ref('')
watch(productId, () => {
  productIdError.value = ''
})
const customChannelInputError = ref('')
watch(customChannelInput, () => {
  customChannelInputError.value = ''
})

const isCreatingAffiliationLinks = ref(false)
const canCreateAffiliationLink = computed(() => {
  if (isUsingCustomDestination.value) {
    return !!customDestinationURLInput.value
  }
  return !!productId.value && !isCreatingAffiliationLinks.value
})

const productData = ref<any>(undefined)

async function fetchProductData () {
  try {
    if (productId.value?.startsWith('col_')) {
      return collectionStore.lazyFetchCollectionById(productId.value)
    } else {
      const { data: classData, error: classFetchError } = await useFetch(`${LIKE_CO_API}/likernft/book/store/${productId.value}`)
      if (classFetchError.value) {
        productIdError.value = 'Cannot fetch class data.'
      } else {
        return classData.value
      }
    }
  } catch {
    productIdError.value = 'Cannot fetch product data.'
  }
  return undefined
}

async function createAffiliationLink () {
  productIdError.value = ''
  productData.value = undefined
  customChannelInputError.value = ''

  if (!canCreateAffiliationLink.value) {
    return
  }

  try {
    isCreatingAffiliationLinks.value = true

    // Validate custom channels
    if (customChannels.value.length) {
      const invalidChannel = customChannels.value.find(channel => !validateChannelId(channel.id))
      if (invalidChannel) {
        customChannelInputError.value = `Invalid channel "${invalidChannel.id}", please enter a valid channel ID starting with "@"`
        return
      }

      try {
        await Promise.all(customChannels.value.map(async (channel) => {
          const channelInfo = await likerStore.lazyFetchChannelInfoById(channel.id)
          if (!channelInfo) {
            throw new Error(`Channel ID "${channel.id}" has not registered for Liker ID`)
          }

          const stripeConnectStatus = await stripeStore.fetchStripeConnectStatusByWallet(channelInfo.likeWallet)
          if (!stripeConnectStatus?.hasAccount) {
            throw new Error(`Channel ID "${channel.id}" has not connected to Stripe`)
          }
          if (!stripeConnectStatus?.isReady) {
            throw new Error(`Channel ID "${channel.id}" has not completed Stripe Connect setup`)
          }
        }))
      } catch (error) {
        customChannelInputError.value = (error as Error).message
        return
      }
    }

    if (productId.value) {
      const data = await fetchProductData()
      if (data) {
        productData.value = data
      }
    } else {
      productData.value = null
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    toast.add({
      icon: 'i-heroicons-exclamation-circle',
      title: 'Failed to create affiliation link',
      timeout: 0,
      color: 'red',
      ui: {
        title: 'text-red-400 dark:text-red-400'
      }
    })
  } finally {
    isCreatingAffiliationLinks.value = false
  }
}

function prefillChannelIdIfPossible () {
  if (!customChannelInput.value && userLikerInfo.value) {
    customChannelInput.value = convertLikerIdToChannelId(userLikerInfo.value.user)
  }
}

onMounted(() => {
  if (productId.value) {
    nextTick(createAffiliationLink)
  }

  prefillChannelIdIfPossible()
})

watch(userLikerInfo, () => {
  if (userLikerInfo.value) {
    prefillChannelIdIfPossible()
  }
})
</script>
