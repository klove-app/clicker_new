export type CompareInput = {
  left: { key: string; amountKey: string; rows: Record<string, unknown>[] };
  right: { key: string; amountKey: string; rows: Record<string, unknown>[] };
};

export type CompareResult = {
  leftNotFound: Record<string, unknown>[];
  rightNotFound: Record<string, unknown>[];
  equalAmounts: { left: Record<string, unknown>; right: Record<string, unknown> }[];
  duplicates: {
    side: 'left' | 'right';
    key: string;
    rows: Record<string, unknown>[];
  }[];
};

function toAmount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function compareBySum({ left, right }: CompareInput): CompareResult {
  const indexRight = new Map<string, Record<string, unknown>[]>()
  const indexLeft = new Map<string, Record<string, unknown>[]>()

  for (const row of right.rows) {
    const key = String(row[right.key] ?? '');
    if (!indexRight.has(key)) indexRight.set(key, []);
    indexRight.get(key)!.push(row);
  }
  for (const row of left.rows) {
    const key = String(row[left.key] ?? '');
    if (!indexLeft.has(key)) indexLeft.set(key, []);
    indexLeft.get(key)!.push(row);
  }

  const leftNotFound: Record<string, unknown>[] = [];
  const rightNotFound: Record<string, unknown>[] = [];
  const equalAmounts: { left: Record<string, unknown>; right: Record<string, unknown> }[] = [];
  const duplicates: CompareResult['duplicates'] = [];

  // detect duplicates by key
  for (const [key, rows] of indexLeft) {
    if (rows.length > 1) duplicates.push({ side: 'left', key, rows });
  }
  for (const [key, rows] of indexRight) {
    if (rows.length > 1) duplicates.push({ side: 'right', key, rows });
  }

  // left vs right
  for (const [key, lrows] of indexLeft) {
    const rrows = indexRight.get(key);
    if (!rrows || rrows.length === 0) {
      leftNotFound.push(...lrows);
      continue;
    }
    // compare by amount equality across any pair
    const lSums = new Set(lrows.map((r) => toAmount(r[left.amountKey])));
    let matched = false;
    for (const r of rrows) {
      const sum = toAmount(r[right.amountKey]);
      if (lSums.has(sum)) {
        // capture all equal pairs
        for (const l of lrows) {
          if (toAmount(l[left.amountKey]) === sum) {
            equalAmounts.push({ left: l, right: r });
          }
        }
        matched = true;
      }
    }
    if (!matched) {
      leftNotFound.push(...lrows);
    }
  }

  // right vs left (those that had no equal)
  for (const [key, rrows] of indexRight) {
    const lrows = indexLeft.get(key);
    if (!lrows || lrows.length === 0) {
      rightNotFound.push(...rrows);
      continue;
    }
    const rSums = new Set(rrows.map((r) => toAmount(r[right.amountKey])));
    let matched = false;
    for (const l of lrows) {
      const sum = toAmount(l[left.amountKey]);
      if (rSums.has(sum)) {
        matched = true;
        break;
      }
    }
    if (!matched) rightNotFound.push(...rrows);
  }

  return { leftNotFound, rightNotFound, equalAmounts, duplicates };
}

export function checkArithmetic(rows: Record<string, unknown>[], b2bCol: string, commCol: string, amountSellCol: string) {
  const issues: { row: Record<string, unknown>; reason: string }[] = [];
  for (const row of rows) {
    const amountB2B = toAmount(row[b2bCol]);
    const commission = toAmount(row[commCol]);
    const amountSell = toAmount(row[amountSellCol]);
    const expectedCommission = +(amountB2B * 0.12).toFixed(2);
    const expectedAmountSell = +(amountB2B - expectedCommission).toFixed(2);
    if (Math.abs(commission - expectedCommission) > 0.01) {
      issues.push({ row, reason: `commission != 12% of amount_b2b2c (got ${commission}, expected ${expectedCommission})` });
    }
    if (Math.abs(amountSell - expectedAmountSell) > 0.01) {
      issues.push({ row, reason: `amount_sell != amount_b2b2c - commission (got ${amountSell}, expected ${expectedAmountSell})` });
    }
  }
  return issues;
}




