import { useMemo, useState } from 'react'

type Props = {
  left: { headers: string[]; rows: Record<string, unknown>[] }
  right: { headers: string[]; rows: Record<string, unknown>[] }
}

export default function JoinPreview({ left, right }: Props) {
  const [leftKey, setLeftKey] = useState<string>('order_id')
  const [rightKey, setRightKey] = useState<string>('Номер')

  const joined = useMemo(() => {
    const idx = new Map<string, Record<string, unknown>>()
    for (const r of right.rows) idx.set(String(r[rightKey] ?? ''), r)
    return left.rows.slice(0, 50).map((l) => ({
      ...l,
      _join_: idx.get(String(l[leftKey] ?? '')) ?? null,
    }))
  }, [left.rows, right.rows, leftKey, rightKey])

  return (
    <div className="card summary">
      <h3>Предпросмотр объединения (первые 50 строк)</h3>
      <div className="join-toolbar">
        <label>
          Ключ слева:
          <select value={leftKey} onChange={(e) => setLeftKey(e.target.value)}>
            {left.headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
        <label>
          Ключ справа:
          <select value={rightKey} onChange={(e) => setRightKey(e.target.value)}>
            {right.headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      </div>
      <table className="preview">
        <thead>
          <tr>
            {left.headers.map((h) => (
              <th key={`L_${h}`}>L:{h}</th>
            ))}
            {right.headers.map((h) => (
              <th key={`R_${h}`}>R:{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {joined.map((r: Record<string, unknown> & { _join_: Record<string, unknown> | null }, idx) => (
            <tr key={idx}>
              {left.headers.map((h) => (
                <td key={`L_${h}_${idx}`}>{String(r[h] ?? '')}</td>
              ))}
              {right.headers.map((h) => (
                <td key={`R_${h}_${idx}`}>{String((r._join_?.[h as keyof typeof r._join_] as unknown) ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


