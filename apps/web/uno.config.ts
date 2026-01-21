
import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({ scale: 1.2 })
  ],
  theme: {
    colors: {
      brand: '#1989fa', // 叁通速达蓝
      accent: '#ff976a', // 活力橙
    }
  }
})
