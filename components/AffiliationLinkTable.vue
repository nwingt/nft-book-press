<template>
  <UCard
    :ui="{
      header: { base: 'flex justify-between items-center' },
      body: { base: 'divide-y divide-gray-200 dark:divide-gray-800', padding: '' }
    }"
  >
    <template #header>
      <div class="flex items-center gap-4">
        <h2 class="font-bold" v-text="productName || ''" />
      </div>

      <UDropdown
        :items="[
          [
            {
              label: 'Print All QR Codes',
              icon: 'i-heroicons-qr-code',
              click: printAllQRCodes,
            },
            {
              label: 'Download QR Codes',
              icon: 'i-heroicons-arrow-down-on-square-stack',
              click: downloadAllQRCodes,
            },
            {
              label: 'Download All Links',
              icon: 'i-heroicons-arrow-down-on-square-stack',
              click: downloadAllPurchaseLinks,
            },
            {
              label: 'Shorten All Links',
              icon: 'i-heroicons-sparkles',
              click: shortenAllLinks,
            },
          ]
        ]"
        :popper="{ placement: 'top-end' }"
      >
        <UButton
          icon="i-heroicons-ellipsis-horizontal-20-solid"
          color="gray"
          variant="soft"
        />
      </UDropdown>
    </template>

    <div v-if="priceIndexOptions.length" class="px-4 py-5 sm:p-6">
      <UFormGroup label="Edition">
        <USelect
          v-model="priceIndex"
          :options="priceIndexOptions"
        />
      </UFormGroup>
    </div>

    <UTable :columns="linkTableColumns" :rows="linkTableRows">
      <template #channelId-data="{ row }">
        <div v-text="row.channelName" />
        <div
          class="text-gray-400 dark:text-gray-700 text-xs font-mono"
          v-text="row.channelId"
        />
      </template>
      <template #utmCampaign-data="{ row }">
        <UKbd class="font-mono" :value="row.utmCampaign" />
      </template>
      <template #link-data="{ row }">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-qr-code"
            variant="outline"
            size="xs"
            @click="selectedPurchaseLink = row"
          />
          <UButton
            icon="i-heroicons-document-duplicate"
            variant="outline"
            size="xs"
            @click="copyLink(row.url || '')"
          />
          <UButton
            class="font-mono break-all"
            :label="row.url"
            :to="row.url"
            color="gray"
            variant="outline"
            size="xs"
            target="_blank"
          />
        </div>
      </template>
    </UTable>
  </UCard>

  <UModal v-model="isOpenQRCodeModal">
    <QRCodeGenerator
      v-if="selectedPurchaseLink"
      :data="selectedPurchaseLink.qrCodeUrl"
      :file-name="getQRCodeFilename(selectedPurchaseLink.channel)"
      :width="500"
      :height="500"
    >
      <template #header>
        <h3 class="font-bold font-mono">
          Download QR Code
        </h3>
        <UButton
          icon="i-heroicons-x-mark"
          color="gray"
          variant="ghost"
          @click="isOpenQRCodeModal = false"
        />
      </template>
    </QRCodeGenerator>
  </UModal>
</template>

<script lang="ts" setup>
import { AFFILIATION_CHANNEL_DEFAULT, AFFILIATION_CHANNELS } from '~/constant'

import { getPurchaseLink } from '~/utils'

const props = defineProps({
  productId: {
    type: String,
    default: ''
  },
  productData: {
    type: Object,
    default: () => ({})
  },
  customChannels: {
    type: Array<{ id: string, name: string }>,
    default: () => []
  },
  isUsingCustomDestination: {
    type: Boolean,
    default: false
  },
  customDestinationUrl: {
    type: String,
    default: ''
  },
  shouldPrefixChannelIdForUtmCampaign: {
    type: Boolean,
    default: false
  },
  linkQueryDefault: {
    type: Object,
    default: () => ({})
  },
  mergedQueryStringObject: {
    type: Object,
    default: () => ({})
  },
  destinationSetting: {
    type: String,
    default: 'liker_land'
  }
})
const router = useRouter()
const toast = useToast()

const isCollection = computed(() => props.productId?.startsWith('col_'))

const linkTableColumns = [
  {
    key: 'channelId',
    label: 'Channel',
    sortable: true
  },
  {
    key: 'utmCampaign',
    label: 'UTM Campaign'
  },
  {
    key: 'link',
    label: 'Link',
    sortable: false
  }
]
const linkTableRows = computed(() => {
  const channels = [...props.customChannels, ...AFFILIATION_CHANNELS]
  return channels.map((channel) => {
    const utmCampaignInput = props.mergedQueryStringObject.utm_campaign
    let utmCampaign = utmCampaignInput || props.linkQueryDefault.utm_campaign || ''
    if (props.shouldPrefixChannelIdForUtmCampaign && channel.id !== AFFILIATION_CHANNEL_DEFAULT) {
      utmCampaign = `${convertChannelIdToLikerId(channel.id)}_${utmCampaign}`
    }
    const urlConfig: any = {
      [isCollection.value ? 'collectionId' : 'classId']: props.productId || '',
      channel: channel.id,
      priceIndex: priceIndex.value,
      customLink: props.isUsingCustomDestination ? props.customDestinationUrl : undefined,
      isUseLikerLandLink: props.destinationSetting === 'liker_land',
      query: {
        utm_campaign: utmCampaign,
        ...props.mergedQueryStringObject
      }
    }
    return {
      channelId: channel.id,
      channelName: channel.name,
      utmCampaign,
      url: getPurchaseLink(urlConfig),
      qrCodeUrl: getPurchaseLink({
        ...urlConfig,
        isForQRCode: props.mergedQueryStringObject.utm_source === props.linkQueryDefault.utm_source
      })
    }
  })
})

const productName = computed(() => {
  if (!props.productData) {
    return ''
  }
  const name = props.productData?.name
  if (isCollection.value && name) {
    return name.zh || name.en
  }
  return name
})
const priceIndex = ref(0)
const priceIndexOptions = computed(() => {
  if (!props.productData || isCollection.value) {
    return []
  }
  return props.productData?.prices.map((price: any) => ({
    label: price.name?.zh || price.name?.en || price.name,
    value: price.index
  }))
})

const selectedPurchaseLink = ref<{
  channel: string,
  url: string,
  qrCodeUrl: string
} | undefined>(undefined)
const isOpenQRCodeModal = computed({
  get: () => !!selectedPurchaseLink.value,
  set: (value) => {
    if (!value) {
      selectedPurchaseLink.value = undefined
    }
  }
})

function getQRCodeFilename (channel = '') {
  const filenameParts: string[] = []
  if (props.isUsingCustomDestination) {
    const url = new URL(props.customDestinationUrl)
    filenameParts.push(url.hostname)
  } else if (isCollection.value) {
    filenameParts.push(`price_${priceIndex.value}`)
  } else {
    filenameParts.push(`${productName.value || props.productId}`)
  }
  if (channel) {
    filenameParts.push(`channel_${channel}`)
  }
  return filenameParts.join('_')
}

async function copyLink (text = '') {
  await navigator.clipboard.writeText(text)
  toast.add({
    icon: 'i-heroicons-check-circle',
    title: 'Copied link to clipboard',
    timeout: 2000,
    color: 'green'
  })
}

function downloadAllPurchaseLinks () {
  downloadFile({
    data: linkTableRows.value,
    fileName: `${productName.value}_purchase_links.csv`,
    fileType: 'csv'
  })
}

function printAllQRCodes () {
  try {
    sessionStorage.setItem(
      'nft_book_press_batch_qrcode',
      convertArrayOfObjectsToCSV(linkTableRows.value.map(({ channelId, qrCodeUrl, ...link }) => ({ key: channelId, ...link, url: qrCodeUrl })))
    )
    window.open('/batch-qrcode?print=1', 'batch_qrcode', 'popup,menubar=no,location=no,status=no')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    toast.add({
      icon: 'i-heroicons-exclamation-circle',
      title: 'Failed to print QR codes',
      timeout: 0,
      color: 'red',
      ui: {
        title: 'text-red-400 dark:text-red-400'
      }
    })
  }
}

function shortenAllLinks () {
  try {
    sessionStorage.setItem(
      'nft_book_press_batch_shorten_url',
      convertArrayOfObjectsToCSV(linkTableRows.value.map(({ channelId, ...link }) => ({ key: channelId, ...link })))
    )
    router.push({ name: 'batch-short-links', query: { print: 1 } })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    toast.add({
      icon: 'i-heroicons-exclamation-circle',
      title: 'Failed to shorten links',
      timeout: 0,
      color: 'red',
      ui: {
        title: 'text-red-400 dark:text-red-400'
      }
    })
  }
}

async function downloadAllQRCodes () {
  const items = linkTableRows.value.map(link => ({
    url: link.qrCodeUrl,
    filename: getQRCodeFilename(link.channelId)
  }))
  await downloadQRCodes(items, {
    zipFilename: `${productName.value || props.productId}_QR Codes`
  })
}
</script>
