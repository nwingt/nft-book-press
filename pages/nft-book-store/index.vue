<template>
  <div>
    <h1>NFT Book Listing</h1>
    <div v-if="error" style="color: red">
      {{ error }}
    </div>
    <div v-if="isLoading" style="color: green">
      Loading...
    </div>
    <hr>
    <section v-if="bookStoreApiStore.isAuthenticated">
      <h2>Current listing</h2>
      <table>
        <tr>
          <td>Class Id</td>
          <td>Price in USD</td>
          <td>Pending action</td>
          <td>Sold</td>
          <td>Remaining Stock</td>
        </tr>
        <tr v-for="b in bookList" :key="b.classId">
          <td>
            <NuxtLink :to="{ name: 'nft-book-store-status-classId', params: { classId: b.classId } }">
              {{ b.classId }}
            </NuxtLink>
          </td>
          <td>{{ b.prices?.map((p: any) => p.price).join(', ') }}</td>
          <td>{{ b.pendingNFTCount }}</td>
          <td>{{ b.sold }}</td>
          <td>{{ b.stock }}</td>
        </tr>
      </table>
      <hr>
      <NuxtLink :to="{ name: 'nft-book-store-new' }">New Listing</NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBookStoreApiStore } from '~/stores/book-store-api'
import { useWalletStore } from '~/stores/wallet'
import { LIKE_CO_API } from '~/constant'

const walletStore = useWalletStore()
const bookStoreApiStore = useBookStoreApiStore()
const { wallet } = storeToRefs(walletStore)

const error = ref('')
const isLoading = ref(false)
const bookList = ref<any[]>([])

watch(isLoading, (newIsLoading) => {
  if (newIsLoading) { error.value = '' }
})

onMounted(async () => {
  const { data, error: fetchError } = await useFetch(`${LIKE_CO_API}/likernft/book/store/list?wallet=${wallet.value}`)
  if (fetchError.value) {
    error.value = fetchError.value.toString()
  }
  bookList.value = (data.value as any)?.list
})

</script>
