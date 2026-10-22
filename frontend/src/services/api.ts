import {
  User, UserRole, Institution, AcademicYear, Application, ApplicationTimelineEvent,
  DocumentItem, ComplianceRule, ComplianceAssessment, RemediationTask,
  RiskAssessment, AlertItem, AssistantQueryResponse, ExecutiveDashboard,
  DocumentVerificationStatus, ApplicationStage, ComplianceRuleStatus
} from '../types';

const API_BASE = '/api/v1';

function getHeaders(isFormData = false): HeadersInit {
  const token = localStorage.getItem('aicte_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const data = await res.json();
      errorDetail = data.detail || JSON.stringify(data);
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async demoLogin(role: UserRole): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/demo-login?role=${role}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Institutions & Academic Years
  async getInstitutions(): Promise<Institution[]> {
    const res = await fetch(`${API_BASE}/institutions/`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getAcademicYears(): Promise<AcademicYear[]> {
    const res = await fetch(`${API_BASE}/institutions/academic-years/all`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateInstitution(id: number, data: Partial<Institution>): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Applications
  async getApplications(): Promise<Application[]> {
    const res = await fetch(`${API_BASE}/applications/`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getApplication(id: number): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createApplication(data: {
    academic_year_id: number;
    application_type: string;
    target_deadline: string;
    priority: string;
  }): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async transitionApplicationStage(id: number, target_stage: ApplicationStage, comments?: string): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}/transition`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ target_stage, comments }),
    });
    return handleResponse(res);
  },

  async recordExternalDecision(id: number, data: {
    submission_ref_number?: string;
    external_decision: string;
    external_decision_date: string;
    external_decision_remarks?: string;
  }): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}/external-decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getApplicationTimeline(id: number): Promise<ApplicationTimelineEvent[]> {
    const res = await fetch(`${API_BASE}/applications/${id}/timeline`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Documents
  async getDocuments(appId: number): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/documents/application/${appId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async uploadDocument(formData: FormData): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  async verifyDocument(
    docId: number,
    verification_status: DocumentVerificationStatus,
    verification_notes?: string
  ): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/${docId}/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ verification_status, verification_notes }),
    });
    return handleResponse(res);
  },

  async correctField(fieldId: number, corrected_value: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/fields/${fieldId}/correct`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ corrected_value }),
    });
    return handleResponse(res);
  },

  // Compliance
  async getComplianceRules(): Promise<ComplianceRule[]> {
    const res = await fetch(`${API_BASE}/compliance/rules`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getAssessments(appId: number): Promise<ComplianceAssessment[]> {
    const res = await fetch(`${API_BASE}/compliance/assessments/${appId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async evaluateCompliance(appId: number): Promise<ComplianceAssessment[]> {
    const res = await fetch(`${API_BASE}/compliance/evaluate/${appId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async overrideAssessment(assessmentId: number, new_status: ComplianceRuleStatus, override_reason: string): Promise<ComplianceAssessment> {
    const res = await fetch(`${API_BASE}/compliance/assessments/${assessmentId}/override`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ new_status, override_reason }),
    });
    return handleResponse(res);
  },

  async getRemediationTasks(appId: number): Promise<RemediationTask[]> {
    const res = await fetch(`${API_BASE}/compliance/tasks/${appId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createRemediationTask(data: {
    application_id: number;
    assessment_id?: number;
    title: string;
    description: string;
    due_date: string;
    priority?: string;
  }): Promise<RemediationTask> {
    const res = await fetch(`${API_BASE}/compliance/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateRemediationTask(taskId: number, data: { status?: string; resolution_notes?: string }): Promise<RemediationTask> {
    const res = await fetch(`${API_BASE}/compliance/tasks/${taskId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Risk
  async getRiskAssessment(appId: number): Promise<RiskAssessment> {
    const res = await fetch(`${API_BASE}/risk/${appId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Alerts
  async getAlerts(): Promise<AlertItem[]> {
    const res = await fetch(`${API_BASE}/alerts/`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async acknowledgeAlert(id: number): Promise<AlertItem> {
    const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async resolveAlert(id: number): Promise<AlertItem> {
    const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async triggerAlertChecks(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/alerts/trigger-checks`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Assistant (RAG)
  async queryAssistant(query: string, appId?: number): Promise<AssistantQueryResponse> {
    const res = await fetch(`${API_BASE}/assistant/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, application_id: appId }),
    });
    return handleResponse(res);
  },

  // Executive Dashboard
  async getExecutiveDashboard(): Promise<ExecutiveDashboard> {
    const res = await fetch(`${API_BASE}/dashboard/executive-overview`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Audit Logs
  async getAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reports/audit-logs`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Admin Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createUser(data: any): Promise<User> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
