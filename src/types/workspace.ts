// Типы для рабочей области

export type ReconciliationRecord = {
  id: string
  timestamp: string
  files: {
    insurance: { name: string; size: number }
    actReport: { name: string; size: number }
  }
  results: {
    matches: number
    notFoundInAct: number
    notFoundInInsurance: number
    formulaErrors: number
    matchPercentage: number
  }
  status: 'completed' | 'error' | 'processing'
  aiAnalysis?: string
  tags?: string[]
}

export type WorkspaceView = 
  | 'dashboard'
  | 'reconcile-single' 
  | 'reconcile-bulk'
  | 'history'
  | 'detailed-view'
  | 'settings'

export type DetailedViewData = {
  record: ReconciliationRecord
  fullResults: any
  rawData?: {
    matches: any[]
    notFoundInAct: any[]
    notFoundInInsurance: any[]
    formulaErrors: any[]
  }
}

