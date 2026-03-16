/**
 * MeetAgent — Mock Data
 * Replace with real API calls when integrating backend.
 * Each constant matches a DynamoDB/S3 entity.
 */

// ── USERS ──
export const USERS = {
  admin: {
    id: 'usr_001',
    name: 'Richie Halim',
    email: 'richie@axrail.com',
    role: 'admin',
    avatar: 'RH',
  },
  user: {
    id: 'usr_002',
    name: 'Sarah Chen',
    email: 'sarah.chen@clientcorp.com',
    role: 'user',
    avatar: 'SC',
  },
};

// ── PROJECTS ──
export const PROJECTS = [
  {
    id: 'proj_001',
    name: 'Axrail Cloud Migration',
    prefix: 'AXR',
    description: 'Cloud migration consulting meetings for Axrail internal infra.',
    agentCount: 2,
    sessionCount: 14,
    documentCount: 8,
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-03-14T10:30:00Z',
  },
  {
    id: 'proj_002',
    name: 'FinServ Sales Enablement',
    prefix: 'FIN',
    description: 'AI-assisted sales meetings for the financial services vertical.',
    agentCount: 1,
    sessionCount: 7,
    documentCount: 5,
    createdAt: '2026-02-28T09:00:00Z',
    updatedAt: '2026-03-15T14:00:00Z',
  },
  {
    id: 'proj_003',
    name: 'HealthTech Demo Calls',
    prefix: 'HLT',
    description: 'Product demo calls with HealthTech prospects.',
    agentCount: 1,
    sessionCount: 3,
    documentCount: 2,
    createdAt: '2026-03-05T11:00:00Z',
    updatedAt: '2026-03-12T16:45:00Z',
  },
];

// ── AGENTS ──
export const AGENTS = [
  {
    id: 'agt_001',
    name: 'TechBot Alpha',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    status: 'active', // active | disabled
    gmailAccount: 'techbot.alpha@axrail-agents.com',
    systemPrompt: `You are TechBot Alpha, a technical solutions architect assistant for Axrail's cloud migration projects.\n\nObjectives:\n- Provide accurate AWS architecture guidance\n- Reference uploaded migration playbooks\n- Maintain a professional, concise tone\n\nBehavioral Guidelines:\n- Always cite specific document sections when possible\n- If unsure, say "I'll need to verify that with the team"\n- Never speculate on pricing without referencing the rate card`,
    personalityTraits: 'Professional, concise, technically precise',
    answeringTone: 'Formal but approachable',
    knowledgeBaseIds: ['kb_001', 'kb_002'],
    lastUpdated: '2026-03-14T10:30:00Z',
    createdAt: '2026-02-10T08:15:00Z',
  },
  {
    id: 'agt_002',
    name: 'SalesHelper',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    status: 'active',
    gmailAccount: 'saleshelper@axrail-agents.com',
    systemPrompt: `You are SalesHelper, a warm and persuasive sales assistant.\n\nObjectives:\n- Help non-technical reps answer client objections\n- Highlight key differentiators from the competitive analysis doc\n- Suggest follow-up actions after tough questions`,
    personalityTraits: 'Warm, persuasive, encouraging',
    answeringTone: 'Conversational and upbeat',
    knowledgeBaseIds: ['kb_001'],
    lastUpdated: '2026-03-13T09:00:00Z',
    createdAt: '2026-02-15T14:00:00Z',
  },
  {
    id: 'agt_003',
    name: 'FinBot',
    projectId: 'proj_002',
    projectPrefix: 'FIN',
    status: 'disabled',
    gmailAccount: 'finbot@axrail-agents.com',
    systemPrompt: `You are FinBot, specializing in financial services compliance topics.`,
    personalityTraits: 'Cautious, detail-oriented',
    answeringTone: 'Formal',
    knowledgeBaseIds: ['kb_003'],
    lastUpdated: '2026-03-10T08:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
];

// ── SESSIONS ──
export const SESSIONS = [
  {
    id: 'ses_001',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    title: 'Axrail Q1 Architecture Review',
    agentId: 'agt_001',
    agentName: 'TechBot Alpha',
    status: 'live', // live | completed | scheduled
    meetLink: 'https://meet.google.com/abc-defg-hij',
    startedAt: '2026-03-16T09:00:00Z',
    endedAt: null,
    duration: null,
    participantCount: 5,
    qnaPairCount: 3,
    connectionQuality: 'good', // good | fair | poor
    latencyMs: 120,
  },
  {
    id: 'ses_002',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    title: 'Client Onboarding — Phase 2',
    agentId: 'agt_002',
    agentName: 'SalesHelper',
    status: 'live',
    meetLink: 'https://meet.google.com/klm-nopq-rst',
    startedAt: '2026-03-16T09:30:00Z',
    endedAt: null,
    duration: null,
    participantCount: 3,
    qnaPairCount: 1,
    connectionQuality: 'fair',
    latencyMs: 340,
  },
  {
    id: 'ses_003',
    projectId: 'proj_002',
    projectPrefix: 'FIN',
    title: 'FinServ Product Demo',
    agentId: 'agt_003',
    agentName: 'FinBot',
    status: 'completed',
    meetLink: 'https://meet.google.com/uvw-xyza-bcd',
    startedAt: '2026-03-15T14:00:00Z',
    endedAt: '2026-03-15T15:12:00Z',
    duration: '1h 12m',
    participantCount: 4,
    qnaPairCount: 8,
    connectionQuality: 'good',
    latencyMs: 95,
  },
  {
    id: 'ses_004',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    title: 'Infrastructure Cost Review',
    agentId: 'agt_001',
    agentName: 'TechBot Alpha',
    status: 'completed',
    meetLink: 'https://meet.google.com/efg-hijk-lmn',
    startedAt: '2026-03-14T10:00:00Z',
    endedAt: '2026-03-14T11:05:00Z',
    duration: '1h 05m',
    participantCount: 6,
    qnaPairCount: 12,
    connectionQuality: 'good',
    latencyMs: 88,
  },
  {
    id: 'ses_005',
    projectId: 'proj_003',
    projectPrefix: 'HLT',
    title: 'HealthTech Intro Call',
    agentId: 'agt_001',
    agentName: 'TechBot Alpha',
    status: 'completed',
    meetLink: 'https://meet.google.com/opq-rstu-vwx',
    startedAt: '2026-03-12T16:00:00Z',
    endedAt: '2026-03-12T16:45:00Z',
    duration: '45m',
    participantCount: 3,
    qnaPairCount: 5,
    connectionQuality: 'good',
    latencyMs: 110,
  },
];

// ── Q&A PAIRS (stored in DynamoDB) ──
export const QNA_PAIRS = [
  {
    id: 'qna_001',
    sessionId: 'ses_001',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    question: 'What is the recommended VPC architecture for multi-AZ deployment?',
    answer: 'For multi-AZ deployment, we recommend a 3-tier VPC with public, private, and data subnets across at least 2 AZs. Each tier uses separate route tables with NAT gateways in each AZ for high availability.',
    detectedAt: '2026-03-16T09:05:32Z',
    answeredAt: '2026-03-16T09:05:38Z',
    lastUpdated: '2026-03-16T09:05:38Z',
  },
  {
    id: 'qna_002',
    sessionId: 'ses_001',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    question: 'How does the auto-scaling policy handle sudden traffic spikes?',
    answer: 'The auto-scaling policy uses target tracking with a CPU utilization target of 65%. Step scaling kicks in at 80% for faster response. We also use predictive scaling based on the past 14-day traffic pattern.',
    detectedAt: '2026-03-16T09:12:15Z',
    answeredAt: '2026-03-16T09:12:22Z',
    lastUpdated: '2026-03-16T09:12:22Z',
  },
  {
    id: 'qna_003',
    sessionId: 'ses_003',
    projectId: 'proj_002',
    projectPrefix: 'FIN',
    question: 'Is the system compliant with PCI DSS requirements?',
    answer: 'Yes, the infrastructure is designed with PCI DSS Level 1 compliance in mind. All cardholder data is encrypted at rest with AES-256 and in transit with TLS 1.3. We maintain quarterly ASV scans.',
    detectedAt: '2026-03-15T14:22:00Z',
    answeredAt: '2026-03-15T14:22:08Z',
    lastUpdated: '2026-03-15T14:22:08Z',
  },
  {
    id: 'qna_004',
    sessionId: 'ses_004',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    question: 'What is the estimated monthly cost for the proposed architecture?',
    answer: 'Based on the sizing in our rate card, the estimated monthly cost is approximately $4,200 for the base infrastructure, scaling to $6,800 under peak load. This includes EC2, RDS, and data transfer costs.',
    detectedAt: '2026-03-14T10:35:00Z',
    answeredAt: '2026-03-14T10:35:06Z',
    lastUpdated: '2026-03-14T10:35:06Z',
  },
];

// ── KNOWLEDGE BASE DOCUMENTS ──
// Backend = single OpenSearch index; UI differentiates by project prefix/tag.
export const KB_DOCUMENTS = [
  {
    id: 'kb_001',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    name: 'Cloud Migration Playbook v3.2.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploadedAt: '2026-02-12T08:00:00Z',
    uploadedBy: 'Richie Halim',
  },
  {
    id: 'kb_002',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    name: 'AWS Architecture Best Practices.docx',
    type: 'docx',
    size: '1.1 MB',
    uploadedAt: '2026-02-14T10:00:00Z',
    uploadedBy: 'Richie Halim',
  },
  {
    id: 'kb_003',
    projectId: 'proj_002',
    projectPrefix: 'FIN',
    name: 'FinServ Compliance Checklist.pdf',
    type: 'pdf',
    size: '890 KB',
    uploadedAt: '2026-03-01T11:00:00Z',
    uploadedBy: 'Richie Halim',
  },
  {
    id: 'kb_004',
    projectId: 'proj_002',
    projectPrefix: 'FIN',
    name: 'Product Feature Matrix Q1-2026.txt',
    type: 'txt',
    size: '45 KB',
    uploadedAt: '2026-03-02T09:30:00Z',
    uploadedBy: 'Richie Halim',
  },
  {
    id: 'kb_005',
    projectId: 'proj_001',
    projectPrefix: 'AXR',
    name: 'Rate Card — Enterprise Tier.pdf',
    type: 'pdf',
    size: '310 KB',
    uploadedAt: '2026-02-20T14:00:00Z',
    uploadedBy: 'Richie Halim',
  },
];

// ── GMAIL CREDENTIALS (display only — NEVER store/show passwords) ──
export const GMAIL_CREDENTIALS = [
  {
    id: 'cred_001',
    agentId: 'agt_001',
    agentName: 'TechBot Alpha',
    email: 'techbot.alpha@axrail-agents.com',
    status: 'verified',
    lastVerified: '2026-03-15T08:00:00Z',
  },
  {
    id: 'cred_002',
    agentId: 'agt_002',
    agentName: 'SalesHelper',
    email: 'saleshelper@axrail-agents.com',
    status: 'verified',
    lastVerified: '2026-03-14T12:00:00Z',
  },
  {
    id: 'cred_003',
    agentId: 'agt_003',
    agentName: 'FinBot',
    email: 'finbot@axrail-agents.com',
    status: 'expired',
    lastVerified: '2026-03-05T10:00:00Z',
  },
];

// ── TRANSCRIPT (sample for session ses_004) ──
export const SAMPLE_TRANSCRIPT = [
  { time: '10:00:12', speaker: 'Sarah Chen', text: 'Thanks everyone for joining. Let\'s start with the cost review.' },
  { time: '10:01:05', speaker: 'James Park', text: 'Sure. I\'ve been looking at the CloudWatch dashboards and noticed our EC2 spend went up 18% this month.' },
  { time: '10:02:30', speaker: 'Sarah Chen', text: 'What is the estimated monthly cost for the proposed architecture?' },
  { time: '10:02:36', speaker: 'TechBot Alpha', text: 'Based on the sizing in our rate card, the estimated monthly cost is approximately $4,200 for the base infrastructure, scaling to $6,800 under peak load.', isAgent: true },
  { time: '10:03:15', speaker: 'James Park', text: 'That aligns with my calculations. Can we get a breakdown by service?' },
  { time: '10:05:00', speaker: 'Sarah Chen', text: 'Let\'s move on to the scaling strategy discussion.' },
];

// ── RETROSPECTIVE (sample, saved as markdown in S3) ──
export const SAMPLE_RETRO = {
  sessionId: 'ses_004',
  summary: `## Meeting Summary\n\nThe team reviewed Q1 infrastructure costs and identified a VPC optimization opportunity. Auto-scaling policies are working but need tuning for the new traffic pattern.\n\n### Key Decisions\n- Adopt reserved instances for baseline EC2 capacity\n- Implement Savings Plans for Fargate workloads\n- Schedule next cost review for April 7\n\n### Action Items\n1. James to prepare RI purchase proposal by March 21\n2. Sarah to update the rate card with new pricing\n3. TechBot configs to be updated with latest cost data`,
  improvements: [
    'Sarah could have probed deeper on the ECS Fargate vs. EC2 cost tradeoff.',
    'The team missed discussing data transfer costs which are 12% of the total bill.',
    'Consider bringing up the Savings Plans earlier in the meeting.',
  ],
  missedAgenda: [
    'Data transfer cost optimization',
    'CloudFront caching strategy review',
  ],
  score: 7.5,
  metadata: {
    duration: '1h 05m',
    participantCount: 6,
    participants: ['Sarah Chen', 'James Park', 'Lisa Wang', 'David Lee', 'Mike Torres', 'TechBot Alpha'],
    totalQuestions: 12,
    agentResponses: 12,
    startedAt: '2026-03-14T10:00:00Z',
    endedAt: '2026-03-14T11:05:00Z',
    project: 'Axrail Cloud Migration',
    agent: 'TechBot Alpha',
  },
};
