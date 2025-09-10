export interface ActReport {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

export interface Insurance {
  id: string;
  policyNumber: string;
  insuredAmount: number;
  premium: number;
  startDate: string;
  endDate: string;
}

export interface ReconciliationResult {
  matched: Array<{
    actReport: ActReport;
    insurance: Insurance;
    confidence: number;
    reason: string;
  }>;
  unmatched: {
    actReports: ActReport[];
    insurance: Insurance[];
  };
  summary: {
    totalMatched: number;
    totalUnmatched: number;
    matchPercentage: number;
  };
}

export async function parseActReport(data: any[]): Promise<ActReport[]> {
  // Парсинг актов отчетности
  return data.map((row, index) => ({
    id: `act_${index}`,
    date: row[0] || '',
    amount: parseFloat(row[1]) || 0,
    description: row[2] || '',
    category: row[3] || 'Прочее'
  }));
}

export async function parseInsurance(data: any[]): Promise<Insurance[]> {
  // Парсинг страховых данных
  return data.map((row, index) => ({
    id: `ins_${index}`,
    policyNumber: row[0] || '',
    insuredAmount: parseFloat(row[1]) || 0,
    premium: parseFloat(row[2]) || 0,
    startDate: row[3] || '',
    endDate: row[4] || ''
  }));
}

export async function performClaudeReconciliation(
  actReports: ActReport[],
  insurance: Insurance[]
): Promise<ReconciliationResult> {
  // Заглушка для Claude API - в реальности здесь будет интеграция с Claude
  const matched = [];
  const unmatchedActReports = [...actReports];
  const unmatchedInsurance = [...insurance];

  // Простая логика сопоставления по сумме (заглушка)
  for (let i = 0; i < actReports.length; i++) {
    const act = actReports[i];
    const matchingInsurance = insurance.find(ins => 
      Math.abs(ins.insuredAmount - act.amount) < 1000
    );

    if (matchingInsurance) {
      matched.push({
        actReport: act,
        insurance: matchingInsurance,
        confidence: 0.8,
        reason: 'Совпадение по сумме'
      });

      const actIndex = unmatchedActReports.findIndex(a => a.id === act.id);
      const insIndex = unmatchedInsurance.findIndex(i => i.id === matchingInsurance.id);
      
      if (actIndex > -1) unmatchedActReports.splice(actIndex, 1);
      if (insIndex > -1) unmatchedInsurance.splice(insIndex, 1);
    }
  }

  return {
    matched,
    unmatched: {
      actReports: unmatchedActReports,
      insurance: unmatchedInsurance
    },
    summary: {
      totalMatched: matched.length,
      totalUnmatched: unmatchedActReports.length + unmatchedInsurance.length,
      matchPercentage: (matched.length / (actReports.length + insurance.length)) * 100
    }
  };
}
