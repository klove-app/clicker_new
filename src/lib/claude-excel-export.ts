import * as XLSX from 'xlsx';
import type { ReconciliationResult } from './claude-parser';

export interface ExportOptions {
  filename?: string;
  includeUnmatched?: boolean;
  includeSummary?: boolean;
}

export function exportClaudeResults(
  results: ReconciliationResult,
  options: ExportOptions = {}
) {
  const {
    filename = 'reconciliation_results.xlsx',
    includeUnmatched = true,
    includeSummary = true
  } = options;

  const workbook = XLSX.utils.book_new();

  // Лист с совпадениями
  if (results.matched.length > 0) {
    const matchedData = results.matched.map(match => ({
      'ID Акта': match.actReport.id,
      'Дата Акта': match.actReport.date,
      'Сумма Акта': match.actReport.amount,
      'Описание Акта': match.actReport.description,
      'Номер Полиса': match.insurance.policyNumber,
      'Страховая Сумма': match.insurance.insuredAmount,
      'Премия': match.insurance.premium,
      'Уверенность': Math.round(match.confidence * 100) + '%',
      'Причина Совпадения': match.reason
    }));

    const matchedSheet = XLSX.utils.json_to_sheet(matchedData);
    XLSX.utils.book_append_sheet(workbook, matchedSheet, 'Совпадения');
  }

  // Лист с несовпадениями
  if (includeUnmatched) {
    const unmatchedData = [
      ...results.unmatched.actReports.map(act => ({
        'Тип': 'Акт отчетности',
        'ID': act.id,
        'Дата': act.date,
        'Сумма': act.amount,
        'Описание': act.description,
        'Категория': act.category,
        'Статус': 'Не сопоставлено'
      })),
      ...results.unmatched.insurance.map(ins => ({
        'Тип': 'Страхование',
        'ID': ins.id,
        'Номер Полиса': ins.policyNumber,
        'Страховая Сумма': ins.insuredAmount,
        'Премия': ins.premium,
        'Начало': ins.startDate,
        'Окончание': ins.endDate,
        'Статус': 'Не сопоставлено'
      }))
    ];

    if (unmatchedData.length > 0) {
      const unmatchedSheet = XLSX.utils.json_to_sheet(unmatchedData);
      XLSX.utils.book_append_sheet(workbook, unmatchedSheet, 'Несовпадения');
    }
  }

  // Лист со сводкой
  if (includeSummary) {
    const summaryData = [
      { 'Метрика': 'Всего совпадений', 'Значение': results.summary.totalMatched },
      { 'Метрика': 'Всего несовпадений', 'Значение': results.summary.totalUnmatched },
      { 'Метрика': 'Процент совпадений', 'Значение': Math.round(results.summary.matchPercentage) + '%' },
      { 'Метрика': 'Дата экспорта', 'Значение': new Date().toLocaleString('ru-RU') }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка');
  }

  // Сохранение файла
  XLSX.writeFile(workbook, filename);
  
  return {
    success: true,
    filename,
    sheetsCreated: workbook.SheetNames.length
  };
}

export function exportToCSV(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
