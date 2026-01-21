// ============================================
// 叁通家具 - 高端演示數據種子腳本
// ============================================
// 使用真實 Unsplash 高清圖片
// 打造畫廊級展示效果

import { PrismaClient, Role, ProductCategory } from '@prisma/client'

let bcrypt: any
try {
  bcrypt = require('bcrypt')
} catch {
  bcrypt = require('bcryptjs')
}

const prisma = new PrismaClient()

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🌱 SANTONG - Database Seed Script')
  console.log('═══════════════════════════════════════════\n')

  // ========================================
  // 1. 創建用戶
  // ========================================
  const adminHash = await bcrypt.hash('admin123', 10)
  const userHash = await bcrypt.hash('user123', 10)

  await prisma.user.deleteMany({ where: { email: { in: ['admin@3links.com', 'user@3links.com'] } } })

  const admin = await prisma.user.create({
    data: { 
      email: 'admin@3links.com', 
      password: adminHash, 
      name: '系統管理員', 
      role: Role.ADMIN,
      points: 10000 // 管理員測試積分
    },
  })
  const user = await prisma.user.create({
    data: { 
      email: 'user@3links.com', 
      password: userHash, 
      name: '測試用戶', 
      role: Role.USER, 
      phone: '0912345678',
      points: 500 // 用戶初始積分
    },
  })
  console.log('✅ 用戶創建完成')

  // ========================================
  // 2. 系統配置
  // ========================================
  const configs = [
    { key: 'exchange_rate', value: '4.6', description: 'RMB 轉 TWD 匯率' },
    { key: 'shipping_price_per_cbm', value: '6000', description: '海運單價 (TWD/m³)' },
    { key: 'shipping_min_charge', value: '800', description: '海運最低消費 (TWD)' },
    { key: 'points_earn_rate', value: '0.01', description: '積分獲取比例 (1%)' },
    { key: 'points_value', value: '1', description: '每積分抵扣金額 (TWD)' },
  ]
  for (const c of configs) {
    await prisma.systemConfig.upsert({ where: { key: c.key }, update: c, create: c })
  }
  console.log('✅ 系統配置完成')

  // ========================================
  // 3. 物流規則
  // ========================================
  await prisma.logisticsRule.deleteMany({})
  await prisma.logisticsRule.createMany({
    data: [
      {
        name: '海運家具專線',
        code: 'SEA_FURNITURE',
        pricePerCbm: 6000,
        pricePerKg: 150,
        minCharge: 800,
        estimatedDays: 10,
        description: '大件家具海運，約7-14個工作天到貨，含清關費用',
        isActive: true,
        isDefault: true,
      },
      {
        name: '空運急件',
        code: 'AIR_EXPRESS',
        pricePerCbm: 18000,
        pricePerKg: 350,
        minCharge: 500,
        estimatedDays: 5,
        description: '急件空運，約3-5個工作天到貨',
        isActive: true,
        isDefault: false,
      },
    ],
  })
  console.log('✅ 物流規則創建完成')

  // ========================================
  // 4. 倉庫地址
  // ========================================
  await prisma.warehouse.deleteMany({})
  await prisma.warehouse.create({
    data: {
      name: '廣州集運倉',
      contactName: '叁通速達',
      phone: '020-12345678',
      province: '廣東省',
      city: '廣州市',
      district: '白雲區',
      address: '嘉禾街道望崗村北路88號叁通物流園A棟',
      postalCode: '510440',
      isDefault: true,
    },
  })
  console.log('✅ 倉庫地址創建完成')

  // ========================================
  // 5. 高端演示商品 (Unsplash HD Images)
  // ========================================
  console.log('\n🖼️  Creating high-end demo products...')
  
  // 清空現有商品
  await prisma.product.deleteMany({})

  // 高質量演示數據
  const demoProducts = [
    // ============================================
    // 客廳 Living Room - SOFA
    // ============================================
    {
      title: 'Baxter 意式極簡磨砂真皮沙發 (三人座)',
      description: '意大利進口頭層牛皮，高密度回彈海綿，北美黑胡桃木底座。簡約而不簡單，為您的客廳注入藝術氣息。含海運木架包裝。',
      price: 8500.00,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.SOFA,
      length: 280,
      width: 95,
      height: 85,
      weight: 75,
      volume: 2.26,
      isFreeShipping: true,
      stock: 10,
      isActive: true,
      isFeatured: true,
      sortOrder: 100,
    },
    {
      title: 'HAY Mags 丹麥設計模組沙發 (L型轉角)',
      description: '丹麥國寶級設計品牌。高彈力冷泡海綿，可拆洗亞麻布套。模組化設計，靈活組合。',
      price: 12800.00,
      images: [
        'https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.SOFA,
      length: 320,
      width: 180,
      height: 80,
      weight: 95,
      volume: 4.61,
      isFreeShipping: true,
      stock: 5,
      isActive: true,
      isFeatured: true,
      sortOrder: 99,
    },
    {
      title: '野口勇 Noguchi 三角玻璃茶几 (復刻版)',
      description: '經典設計大師作品。19mm超厚鋼化玻璃台面，實木三角支架。充滿雕塑感的設計，是客廳的視覺焦點。',
      price: 1280.00,
      images: [
        'https://images.unsplash.com/photo-1634712282287-14ed57b9cc89?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.TABLE,
      length: 128,
      width: 93,
      height: 40,
      weight: 35,
      volume: 0.48,
      isFreeShipping: true,
      stock: 20,
      isActive: true,
      isFeatured: false,
      sortOrder: 80,
    },
    {
      title: 'Eames Lounge Chair 伊姆斯躺椅 (復刻版)',
      description: '1956年經典之作。巴西花梨木飾面，意大利真皮坐墊。360°旋轉底座，附腳蹬。',
      price: 6800.00,
      images: [
        'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.CHAIR,
      length: 84,
      width: 85,
      height: 89,
      weight: 38,
      volume: 0.64,
      isFreeShipping: true,
      stock: 8,
      isActive: true,
      isFeatured: true,
      sortOrder: 95,
    },

    // ============================================
    // 臥室 Bedroom - BED
    // ============================================
    {
      title: '北歐懸浮實木雙人床 (帶軟包靠背)',
      description: '進口白蠟木框架，科技布軟包床頭。獨特的懸浮設計，方便掃地機器人進出，視覺更輕盈。',
      price: 3500.00,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1616594039964-3a821166549c?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.BED,
      length: 218,
      width: 188,
      height: 95,
      weight: 120,
      volume: 3.89,
      isFreeShipping: true,
      stock: 15,
      isActive: true,
      isFeatured: true,
      sortOrder: 98,
    },
    {
      title: 'Minotti 意式輕奢真皮床 (King Size)',
      description: '全床頭層小牛皮包裹，手工縫線工藝。內置USB充電口，床頭可調節角度。',
      price: 18500.00,
      images: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.BED,
      length: 230,
      width: 200,
      height: 110,
      weight: 150,
      volume: 5.06,
      isFreeShipping: true,
      stock: 3,
      isActive: true,
      isFeatured: true,
      sortOrder: 97,
    },
    {
      title: '白橡木床頭櫃 (無把手設計)',
      description: '進口FAS級白橡木，德國Blum緩衝滑軌。按壓式開門設計，簡潔優雅。',
      price: 980.00,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.CABINET,
      length: 50,
      width: 45,
      height: 55,
      weight: 25,
      volume: 0.12,
      isFreeShipping: true,
      stock: 50,
      isActive: true,
      isFeatured: false,
      sortOrder: 60,
    },

    // ============================================
    // 餐廳 Dining - TABLE
    // ============================================
    {
      title: '意式輕奢岩板餐桌 (Pandora)',
      description: '12mm 進口岩板台面，莫氏硬度7級，耐刮耐高溫。馬鞍皮包裹碳素鋼底座，穩固承重。',
      price: 2800.00,
      images: [
        'https://images.unsplash.com/photo-1577140917170-285929fb55b7?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1617806118233-18e1de247200?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.TABLE,
      length: 160,
      width: 90,
      height: 75,
      weight: 85,
      volume: 1.08,
      isFreeShipping: true,
      stock: 25,
      isActive: true,
      isFeatured: true,
      sortOrder: 96,
    },
    {
      title: '北歐實木圓餐桌 (可延伸)',
      description: '進口白蠟木，環保木蠟油塗裝。獨特的蝴蝶延伸設計，4-8人靈活切換。',
      price: 3200.00,
      images: [
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.TABLE,
      length: 140,
      width: 140,
      height: 75,
      weight: 65,
      volume: 1.47,
      isFreeShipping: true,
      stock: 12,
      isActive: true,
      isFeatured: false,
      sortOrder: 85,
    },
    {
      title: '中古風藤編餐椅 (昌迪加爾椅)',
      description: '手工印尼瑪瑙藤編織，進口櫸木框架。復古與現代的完美結合，透氣舒適。',
      price: 450.00,
      images: [
        'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.CHAIR,
      length: 55,
      width: 52,
      height: 80,
      weight: 8,
      volume: 0.23,
      isFreeShipping: false,
      stock: 100,
      isActive: true,
      isFeatured: false,
      sortOrder: 70,
    },
    {
      title: 'Wishbone Chair Y椅 (復刻版)',
      description: 'Hans Wegner 經典設計。天然櫸木框架，手工編織紙繩座面。丹麥設計美學代表。',
      price: 680.00,
      images: [
        'https://images.unsplash.com/photo-1551298370-9d3d53f8e2dc?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.CHAIR,
      length: 55,
      width: 51,
      height: 76,
      weight: 6,
      volume: 0.21,
      isFreeShipping: false,
      stock: 80,
      isActive: true,
      isFeatured: true,
      sortOrder: 88,
    },

    // ============================================
    // 儲物 Storage - CABINET
    // ============================================
    {
      title: 'USM Haller 模組化置物架 (經典款)',
      description: '瑞士精工製造。熱鍍鋅鋼管框架，粉末噴塗面板。無限組合可能，終身保修。',
      price: 8900.00,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.CABINET,
      length: 154,
      width: 39,
      height: 179,
      weight: 65,
      volume: 1.08,
      isFreeShipping: true,
      stock: 6,
      isActive: true,
      isFeatured: true,
      sortOrder: 90,
    },
    {
      title: '胡桃木電視櫃 (懸掛式)',
      description: '北美黑胡桃木，隱藏式走線設計。壁掛安裝，懸浮視覺效果。含安裝五金件。',
      price: 2200.00,
      images: [
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=1200&auto=format&fit=crop'
      ],
      category: ProductCategory.CABINET,
      length: 180,
      width: 40,
      height: 35,
      weight: 45,
      volume: 0.25,
      isFreeShipping: true,
      stock: 20,
      isActive: true,
      isFeatured: false,
      sortOrder: 75,
    },
  ]

  // 批量創建商品
  for (const product of demoProducts) {
    await prisma.product.create({ data: product })
  }

  console.log(`✅ 高端商品創建完成 (${demoProducts.length} 件)\n`)

  // ========================================
  // 完成
  // ========================================
  console.log('═══════════════════════════════════════════')
  console.log('🎉 Database seed completed!')
  console.log('═══════════════════════════════════════════')
  console.log('\n📝 Test Accounts:')
  console.log('   Admin: admin@3links.com / admin123')
  console.log('   User:  user@3links.com / user123')
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
