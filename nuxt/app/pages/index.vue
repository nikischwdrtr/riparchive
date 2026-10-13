
<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef
} from 'vue'

console.log(
  '%c ♕ niki is king ♕',
  'background: #ffffff; color: #00FF00'
)

type ArchiveImage = {
  id: number
  title: string
  src: string
  metadata: string
}

type ArenaBlock = {
  id: number
  type: string
  title?: string | null
  description?: string | null
  content?: string | null
  created_at?: string | null
  updated_at?: string | null
  source?: {
    url?: string | null
    title?: string | null
  } | null
  user?: {
    name?: string | null
  } | null
  image?: {
    src?: string
    display?: { url?: string }
    large?: { url?: string }
    thumb?: { url?: string }
  }
}

type ArenaResponse = {
  data: ArenaBlock[]
  meta: {
    next_page: number | null
    has_more_pages: boolean
  }
}

// --------------------------------
// Configuration
// --------------------------------

const CHANNEL = 'doc-2glibd4reqc'
const PER_PAGE = 100

const BUFFER_BEFORE = 2
const BUFFER_AFTER = 3
const PRELOAD_AHEAD = 5

// --------------------------------
// State
// --------------------------------

const images = shallowRef<ArchiveImage[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const error = ref('')

const archiveRef = ref<HTMLElement | null>(null)

let raf = 0
let resizeObserver: ResizeObserver | null = null
let active = true

const preloadedImages = new Set<string>()

// --------------------------------
// Shuffle entire archive
// --------------------------------

function shuffle<T>(array: T[]): T[] {
  const result = [...array]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[result[i], result[j]] = [
      result[j]!,
      result[i]!
    ]
  }

  return result
}

// --------------------------------
// Fetch all Are.na metadata
// --------------------------------

async function fetchArchive() {
  loading.value = true
  error.value = ''

  try {
    const allBlocks: ArenaBlock[] = []
    let page: number | null = 1

    while (page !== null) {
      const url = new URL(
        `https://api.are.na/v3/channels/${CHANNEL}/contents`
      )

      url.searchParams.set('page', String(page))
      url.searchParams.set('per', String(PER_PAGE))

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Are.na API: ${response.status}`)
      }

      const result: ArenaResponse = await response.json()

      allBlocks.push(...result.data)

      const next = result.meta?.next_page

      page = result.meta?.has_more_pages && next
        ? next
        : null
    }

    if (!active) return

    const archiveImages: ArchiveImage[] = allBlocks
      .filter((block) => block.type === 'Image')
      .map((block) => ({
        id: block.id,
        title: block.title || '',
        src:
          block.image?.display?.url ||
          block.image?.large?.url ||
          block.image?.src ||
          '',
        
        metadata: [
          block.title || '',
          block.description || block.content || '',
          block.user?.name || '',
          block.created_at
            ? new Date(block.created_at).toLocaleDateString('de-CH')
            : '',
          block.updated_at
            ? new Date(block.updated_at).toLocaleDateString('de-CH')
            : '',
          block.source?.title || '',
          block.source?.url || ''
        ]
          .filter(Boolean)
          .join(' ')

      }))
      .filter((image) => Boolean(image.src))

    images.value = shuffle(archiveImages)

    await nextTick()

    updateScroll()
    preloadNearby(0)

  } catch (err) {
    console.error('Are.na archive error:', err)

    if (active) {
      error.value = 'Could not load archive.'
    }
  } finally {
    if (active) {
      loading.value = false
    }
  }
}

// --------------------------------
// Virtualized sections
// --------------------------------

const archiveHeight = computed(() => {
  return `${images.value.length * 100}svh`
})

const visibleSections = computed(() => {
  const start = Math.max(
    0,
    currentIndex.value - BUFFER_BEFORE
  )

  const end = Math.min(
    images.value.length,
    currentIndex.value + BUFFER_AFTER + 1
  )

  const sections: {
    index: number
    image: ArchiveImage
  }[] = []

  for (let i = start; i < end; i++) {
    sections.push({
      index: i,
      image: images.value[i]!
    })
  }

  return sections
})

// --------------------------------
// Preload nearby images
// --------------------------------

function preloadNearby(index: number) {
  const start = Math.max(0, index - 1)

  const end = Math.min(
    images.value.length,
    index + PRELOAD_AHEAD + 1
  )

  for (let i = start; i < end; i++) {
    const src = images.value[i]?.src

    if (!src || preloadedImages.has(src)) continue

    preloadedImages.add(src)

    const image = new Image()
    image.decoding = 'async'
    image.src = src
  }
}

// --------------------------------
// Scroll tracking
// --------------------------------

function updateScroll() {
  if (!archiveRef.value || images.value.length === 0) return

  const rect = archiveRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight

  const position = Math.max(
    0,
    -rect.top / viewportHeight
  )

  const index = Math.min(
    Math.floor(position),
    images.value.length - 1
  )

  if (index !== currentIndex.value) {
    currentIndex.value = index
    preloadNearby(index)
  }
}

function onScroll() {
  if (raf) return

  raf = requestAnimationFrame(() => {
    raf = 0
    updateScroll()
  })
}

// --------------------------------
// Lifecycle
// --------------------------------

onMounted(async () => {
  active = true

  window.addEventListener('scroll', onScroll, {
    passive: true
  })

  window.addEventListener('resize', onScroll)

  await fetchArchive()

  if (archiveRef.value) {
    resizeObserver = new ResizeObserver(onScroll)
    resizeObserver.observe(archiveRef.value)
  }
})

onUnmounted(() => {
  active = false

  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)

  if (raf) cancelAnimationFrame(raf)

  resizeObserver?.disconnect()
  preloadedImages.clear()
})
function openWebsite() {
  window.open('https://www.niklausiff.rip/', '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <main class="index-container">

    <!-- Name overlay -->
    <div
      class="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center max-sm:items-start max-sm:justify-start"
    >
      <h1
        class="pointer-events-auto cursor-pointer"
        role="link"
        tabindex="0"
        @click="openWebsite"
        @keydown.enter="openWebsite"
      >
        niklaus iff
      </h1>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="archive-message"
    >
      loading archive...
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="archive-message"
    >
      {{ error }}

      <button
        type="button"
        @click="fetchArchive"
      >
        retry
      </button>
    </div>

    <!-- Archive -->
    <div
      v-else
      ref="archiveRef"
      class="archive"
      :style="{ height: archiveHeight }"
    >
      <div
        v-for="section in visibleSections"
        :key="section.image.id"
        class="index-section"
        :style="{
          top: `${section.index * 100}svh`
        }"
      >
        <!-- Are.na metadata -->
        <pre class="archive-metadata">{{ section.image.metadata }}</pre>

        <!-- Image -->
        <div class="index-archive">
          <div class="index-image">
            <img
              :src="section.image.src"
              :alt="section.image.title"
              decoding="async"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>

  </main>
</template>

<style>
/* --------------------------------
   Base
-------------------------------- */

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
}

.index-container {
  position: relative;
  width: 100%;
  min-height: 100svh;
}

.archive {
  position: relative;
  width: 100%;
}

/* --------------------------------
   Sections
-------------------------------- */

.index-section {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100svh;
}

.index-archive {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  clip-path: inset(0);
}

/* --------------------------------
   Images
-------------------------------- */

.index-image {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 40%;
  height: 90%;
  transform: translate(-50%, -50%);

  display: flex;
  justify-content: center;
  align-items: center;
}

.index-image img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 90%;
  object-fit: contain;
}

/* --------------------------------
   Metadata
-------------------------------- */

.archive-metadata {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);

  width: max-content;
  max-width: none;

  margin: 0;
  padding: 0;

  white-space: nowrap;
  font: inherit;
  color: inherit;
  z-index: 1;
}

/* --------------------------------
   Mobile
-------------------------------- */

@media (max-width: 600px) {
  .index-image {
    width: 75%;
  }

  .archive-metadata {
    width: 38vw;
    left: 8px;
    font-size: 12px;
  }
}

/* --------------------------------
   Loading / errors
-------------------------------- */

.archive-message {
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 100svh;
  margin: 0;
  padding-top: 150px;

  text-transform: lowercase;
  font-size: 12px;
  gap: 12px;
}

.archive-message button {
  border: 0;
  background: transparent;
  text-decoration: underline;
  font: inherit;
  cursor: pointer;
}

/* --------------------------------
   Typography
-------------------------------- */

a,
p,
h1,
span,
td {
  margin: 0;
  text-transform: lowercase;
}

h1 {
  filter: blur(0.2rem);
  font-size: 3rem;
  color: rgb(0, 255, 0);

  transition-duration: 0.2s;
  transition-timing-function: ease-in-out;

  user-select: none;
  text-transform: lowercase;

  border: solid;
  border-radius: 50%;
}

h1:hover {
  cursor: pointer;
  filter: blur(0.5rem);
}
</style>
