import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export type Table = {
  name: string
  headers: string[]
  rows: Record<string, unknown>[]
}

function writeSheet(workbook: ExcelJS.Workbook, title: string, headers: string[], rows: Record<string, unknown>[]) {
  const ws = workbook.addWorksheet(title)
  ws.addRow(headers)
  // header style
  ws.getRow(1).font = { bold: true }
  rows.forEach((row) => {
    ws.addRow(headers.map((h) => row[h] as ExcelJS.CellValue))
  })
  ws.columns.forEach((c) => {
    c.width = Math.min(50, Math.max(12, (c.values?.reduce((m: number, v) => Math.max(m, String(v ?? '').length), 0) as number) + 2))
  })
  return ws
}

export async function exportSummaryExcel(
  params: {
    left: Table
    right: Table
    summary: {
      leftNotFound: Record<string, unknown>[]
      rightNotFound: Record<string, unknown>[]
      equalPairs: { left: Record<string, unknown>; right: Record<string, unknown> }[]
      duplicates: { side: 'left' | 'right'; key: string; rows: Record<string, unknown>[] }[]
      arithmeticIssues: { row: Record<string, unknown>; reason: string }[]
    }
  },
  filename = 'reconcile-summary.xlsx',
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ETG reconcile app'
  wb.created = new Date()

  // summary sheet
  const summary = wb.addWorksheet('Итоги')
  summary.addRows([
    ['Не найдено в акте', params.summary.leftNotFound.length],
    ['Не найдено в выгрузке', params.summary.rightNotFound.length],
    ['Совпадений по сумме', params.summary.equalPairs.length],
    ['Дубли', params.summary.duplicates.length],
    ['Ошибки арифметики', params.summary.arithmeticIssues.length],
  ])

  writeSheet(wb, 'Выгрузка_не_найдена_в_акте', params.left.headers, params.summary.leftNotFound)
  writeSheet(wb, 'Акт_не_найден_в_выгрузке', params.right.headers, params.summary.rightNotFound)

  const equalHeaders = [
    ...params.left.headers.map((h) => `L:${h}`),
    ...params.right.headers.map((h) => `R:${h}`),
  ]
  const equalRows = params.summary.equalPairs.map(({ left, right }) => {
    const row: Record<string, unknown> = {}
    params.left.headers.forEach((h) => (row[`L:${h}`] = left[h]))
    params.right.headers.forEach((h) => (row[`R:${h}`] = right[h]))
    return row
  })
  writeSheet(wb, 'Совпадения_по_сумме', equalHeaders, equalRows)

  const dupHeaders = ['side', 'key', ...params.left.headers, ...params.right.headers]
  const dupRows = params.summary.duplicates.flatMap((d) =>
    d.rows.map((r) => ({ side: d.side, key: d.key, ...r })),
  )
  writeSheet(wb, 'Дубли', dupHeaders, dupRows)

  const arHeaders = ['reason', ...params.left.headers]
  const arRows = params.summary.arithmeticIssues.map((i) => ({ reason: i.reason, ...i.row }))
  writeSheet(wb, 'Ошибки_арифметики', arHeaders, arRows)

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

export async function exportAnnotatedOriginal(
  params: {
    table: Table
    issues: { match: (row: Record<string, unknown>) => string | null }
    filename: string
  },
) {
  const wb = new ExcelJS.Workbook()
  const ws = writeSheet(wb, 'data', [...params.table.headers, 'reason'], params.table.rows.map((r) => ({ ...r, reason: params.issues.match(r) })))
  // highlight rows with reason
  for (let i = 2; i <= ws.rowCount; i++) {
    const reason = String(ws.getCell(i, params.table.headers.length + 1).value ?? '')
    if (reason) {
      ws.getRow(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE599' }, // light yellow
      }
    }
  }
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), params.filename)
}




