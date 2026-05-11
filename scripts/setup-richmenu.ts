/**
 * LINE リッチメニュー セットアップスクリプト
 * 実行: pnpm tsx scripts/setup-richmenu.ts
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import sharp from 'sharp'

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error('LINE_CHANNEL_ACCESS_TOKEN が未設定です')
  process.exit(1)
}

const LINE_API = 'https://api.line.me/v2/bot'
const headers = {
  'Authorization': `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
}

// ① SVG → PNG 変換
async function convertSvgToPng(): Promise<Buffer> {
  console.log('SVG → PNG 変換中...')
  const svgPath = resolve('public/richmenu.svg')
  const svgBuffer = readFileSync(svgPath)
  const png = await sharp(svgBuffer)
    .resize(2500, 1686)
    .png()
    .toBuffer()
  writeFileSync('public/richmenu.png', png)
  console.log('✔ public/richmenu.png 生成完了')
  return png
}

// ② リッチメニュー作成
async function createRichMenu(): Promise<string> {
  console.log('リッチメニュー作成中...')
  const richMenu = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: '打刻メニュー',
    chatBarText: '打刻する',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: { type: 'postback', label: '出勤', data: 'action=clock_in', displayText: '出勤' }
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: { type: 'postback', label: '退勤', data: 'action=clock_out', displayText: '退勤' }
      },
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: { type: 'postback', label: '休憩開始', data: 'action=break_start', displayText: '休憩開始' }
      },
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: { type: 'postback', label: '休憩終了', data: 'action=break_end', displayText: '休憩終了' }
      }
    ]
  }

  const res = await fetch(`${LINE_API}/richmenu`, {
    method: 'POST',
    headers,
    body: JSON.stringify(richMenu)
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`リッチメニュー作成失敗: ${res.status} ${err}`)
  }
  const data = await res.json() as { richMenuId: string }
  console.log(`✔ リッチメニュー作成: ${data.richMenuId}`)
  return data.richMenuId
}

// ③ 画像アップロード
async function uploadImage(richMenuId: string, imageBuffer: Buffer): Promise<void> {
  console.log('画像アップロード中...')
  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'image/png'
    },
    body: imageBuffer
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`画像アップロード失敗: ${res.status} ${err}`)
  }
  console.log('✔ 画像アップロード完了')
}

// ④ デフォルトリッチメニューとして設定
async function setDefault(richMenuId: string): Promise<void> {
  console.log('デフォルトに設定中...')
  const res = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`デフォルト設定失敗: ${res.status} ${err}`)
  }
  console.log('✔ 全ユーザーにリッチメニューを適用しました')
}

// 既存リッチメニューを削除
async function deleteExistingMenus(): Promise<void> {
  const res = await fetch(`${LINE_API}/richmenu/list`, { headers })
  if (!res.ok) return
  const data = await res.json() as { richmenus: { richMenuId: string, name: string }[] }
  for (const menu of data.richmenus) {
    console.log(`既存リッチメニューを削除: ${menu.name} (${menu.richMenuId})`)
    await fetch(`${LINE_API}/richmenu/${menu.richMenuId}`, { method: 'DELETE', headers })
  }
}

async function main() {
  console.log('=== LINE リッチメニュー セットアップ開始 ===\n')
  await deleteExistingMenus()
  const imageBuffer = await convertSvgToPng()
  const richMenuId = await createRichMenu()
  await uploadImage(richMenuId, imageBuffer)
  await setDefault(richMenuId)
  console.log('\n✅ セットアップ完了！')
  console.log(`リッチメニューID: ${richMenuId}`)
}

main().catch((err) => {
  console.error('❌ エラー:', err.message)
  process.exit(1)
})
