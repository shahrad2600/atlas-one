/**
 * Atlas One -- Support Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for customer support,
 * booking issues, refund processing, policy lookups, and case
 * management with realistic mock data.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Support Specialist Agent
// ---------------------------------------------------------------------------

export class SupportSpecialist implements Agent {
  name = 'support-agent';

  description =
    'Expert in resolving booking issues, cancellations, modifications, complaints, ' +
    'refund processing, policy interpretation, and case management. Empathetic ' +
    'and solution-oriented with clear communication.';

  systemPrompt =
    'You are the Atlas One Support Specialist -- an expert in resolving ' +
    'booking issues, cancellations, modifications, and complaints.\n\n' +
    'Your expertise:\n' +
    '- Refund processing and policy interpretation\n' +
    '- Rescheduling across multiple linked bookings\n' +
    '- Insurance claim filing and documentation\n' +
    '- Dispute resolution and compensation negotiation\n' +
    '- Cancellation impact analysis (dependent bookings)\n\n' +
    'Communication style:\n' +
    '- Empathetic and solution-oriented\n' +
    '- Explain policies clearly in plain language\n' +
    '- Present all available options, not just the easiest\n' +
    '- Manage expectations honestly about timelines\n\n' +
    'Constraints:\n' +
    '- Never promise refund amounts without policy verification\n' +
    '- Always explain cancellation impacts on linked bookings\n' +
    '- File claims with complete documentation';

  tools = ['lookupReservation', 'processRefund', 'createSupportCase', 'getPolicy'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    const isRefund = /refund|reimburse|money back|charge back/i.test(lower);
    const isPolicy = /policy|policies|rules|terms|cancellation policy|what.*if/i.test(lower);
    const isCase = /complaint|issue|problem|broken|wrong|mistake|report|escalate/i.test(lower);
    const isLookup = /booking|reservation|confirmation|look.*up|find.*my|status/i.test(lower);

    if (isRefund) {
      return this.handleRefund(message, context, actions);
    }

    if (isPolicy) {
      return this.handlePolicyLookup(message, actions);
    }

    if (isCase) {
      return this.handleSupportCase(message, context, actions);
    }

    if (isLookup) {
      return this.handleReservationLookup(message, context, actions);
    }

    // Default: general support with reservation lookup
    return this.handleGeneralSupport(message, context, actions);
  }

  private async handleReservationLookup(
    message: string,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Try to extract a confirmation code from the message
    const codeMatch = message.match(/[A-Z]{2,4}-[A-Z0-9]{6,8}/i);
    const confirmationCode = codeMatch ? codeMatch[0].toUpperCase() : 'ATL-K8M4X2';

    const lookupAction: ToolAction = {
      tool: 'lookupReservation',
      params: { confirmationCode, userId: context.userId },
      result: {
        reservationId: `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        confirmationCode,
        type: 'hotel',
        status: 'confirmed',
        provider: 'Four Seasons Hotel New York Downtown',
        details: {
          checkIn: '2026-03-20',
          checkOut: '2026-03-23',
          roomType: 'Deluxe King Room',
          guests: 2,
          nights: 3,
        },
        pricing: {
          subtotal: 1245,
          taxes: 186.75,
          fees: 75,
          total: 1506.75,
          currency: 'USD',
          paymentMethod: 'Visa ending in 4242',
          paymentStatus: 'fully_paid',
        },
        cancellation: {
          policy: 'Free cancellation until 48 hours before check-in',
          deadline: '2026-03-18T14:00:00Z',
          refundType: 'full',
          penaltyAfterDeadline: 'First night charge ($415)',
        },
        linkedBookings: [
          { type: 'flight', confirmationCode: 'AA-M7K9P3', description: 'AA 100 JFK-LHR Mar 20' },
          { type: 'dining', confirmationCode: 'DIN-X4R8N2', description: 'Le Bernardin dinner Mar 21' },
        ],
        createdAt: '2026-02-15T10:30:00Z',
        modifiedAt: '2026-02-20T14:15:00Z',
      },
      status: 'executed' as const,
    };
    actions.push(lookupAction);

    const r = lookupAction.result as Record<string, unknown>;
    const details = r['details'] as Record<string, unknown>;
    const pricing = r['pricing'] as Record<string, unknown>;
    const cancellation = r['cancellation'] as Record<string, unknown>;
    const linked = r['linkedBookings'] as Array<{ type: string; confirmationCode: string; description: string }>;

    let text = `**Reservation Found**\n\n`;
    text += `**${r['provider'] as string}**\n`;
    text += `Confirmation: ${r['confirmationCode'] as string} | Status: ${(r['status'] as string).toUpperCase()}\n\n`;

    text += `**Details:**\n`;
    text += `- Check-in: ${details['checkIn'] as string}\n`;
    text += `- Check-out: ${details['checkOut'] as string}\n`;
    text += `- Room: ${details['roomType'] as string}\n`;
    text += `- Guests: ${details['guests'] as number} | Nights: ${details['nights'] as number}\n\n`;

    text += `**Payment:**\n`;
    text += `- Subtotal: $${pricing['subtotal'] as number}\n`;
    text += `- Taxes & fees: $${(pricing['taxes'] as number) + (pricing['fees'] as number)}\n`;
    text += `- Total: $${pricing['total'] as number}\n`;
    text += `- Paid with: ${pricing['paymentMethod'] as string}\n\n`;

    text += `**Cancellation Policy:**\n`;
    text += `- ${cancellation['policy'] as string}\n`;
    text += `- Deadline: ${(cancellation['deadline'] as string).replace('T', ' at ').replace('Z', ' UTC')}\n`;
    text += `- After deadline: ${cancellation['penaltyAfterDeadline'] as string}\n\n`;

    if (linked.length > 0) {
      text += `**Linked Bookings:**\n`;
      for (const lb of linked) {
        text += `- ${lb.type}: ${lb.description} (${lb.confirmationCode})\n`;
      }
      text += `\nNote: Cancelling this stay may affect linked bookings above.`;
    }

    return {
      message: text,
      actions,
      suggestions: [
        'Request a modification',
        'Start cancellation process',
        'Check refund eligibility',
        'File a complaint',
      ],
      confidence: 0.92,
    };
  }

  private async handleRefund(
    message: string,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Extract amount if mentioned
    const amountMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
    const requestedAmount = amountMatch ? parseFloat(amountMatch[1]) : null;

    const refundAction: ToolAction = {
      tool: 'processRefund',
      params: {
        userId: context.userId,
        tripId: context.tripId ?? 'trip_current',
        reservationId: 'res_lookup_default',
        reason: message,
      },
      result: {
        refundId: `rfd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        status: 'pending_review',
        reservation: {
          confirmationCode: 'ATL-K8M4X2',
          provider: 'Four Seasons Hotel New York Downtown',
          originalAmount: 1506.75,
          currency: 'USD',
        },
        eligibility: {
          eligible: true,
          refundableAmount: 1506.75,
          nonRefundableAmount: 0,
          refundType: 'full',
          reason: 'Within free cancellation window (48h before check-in)',
          processingTime: '5-10 business days',
        },
        breakdown: {
          roomCharges: 1245.00,
          taxes: 186.75,
          fees: 75.00,
          serviceFee: -25.00,
          totalRefund: 1481.75,
        },
        paymentMethod: 'Original payment method (Visa ending in 4242)',
        timeline: [
          { step: 'Refund requested', date: new Date().toISOString().split('T')[0], status: 'completed' },
          { step: 'Review by support team', date: 'Within 24 hours', status: 'pending' },
          { step: 'Refund processed', date: 'Within 2-3 business days', status: 'upcoming' },
          { step: 'Funds in your account', date: 'Within 5-10 business days', status: 'upcoming' },
        ],
        warnings: [
          'A $25 service fee will be deducted from the refund.',
          'Cancelling will also affect your linked dining reservation at Le Bernardin.',
        ],
      },
      status: 'executed' as const,
    };
    actions.push(refundAction);

    const r = refundAction.result as Record<string, unknown>;
    const eligibility = r['eligibility'] as Record<string, unknown>;
    const breakdown = r['breakdown'] as Record<string, unknown>;
    const timeline = r['timeline'] as Array<{ step: string; date: string; status: string }>;
    const warnings = r['warnings'] as string[];
    const reservation = r['reservation'] as Record<string, unknown>;

    let text = `**Refund Assessment**\n\n`;
    text += `**Booking:** ${reservation['provider'] as string} (${reservation['confirmationCode'] as string})\n`;
    text += `**Original Amount:** $${reservation['originalAmount'] as number}\n\n`;

    text += `**Eligibility:** ${(eligibility['eligible'] as boolean) ? 'ELIGIBLE' : 'NOT ELIGIBLE'}\n`;
    text += `- Reason: ${eligibility['reason'] as string}\n`;
    text += `- Refund type: ${(eligibility['refundType'] as string).toUpperCase()}\n\n`;

    text += `**Refund Breakdown:**\n`;
    text += `- Room charges: $${breakdown['roomCharges'] as number}\n`;
    text += `- Taxes returned: $${breakdown['taxes'] as number}\n`;
    text += `- Fees returned: $${breakdown['fees'] as number}\n`;
    text += `- Service fee: -$${Math.abs(breakdown['serviceFee'] as number)}\n`;
    text += `- **Total refund: $${breakdown['totalRefund'] as number}**\n\n`;

    text += `**Timeline:**\n`;
    for (const step of timeline) {
      const icon = step.status === 'completed' ? '[done]' : step.status === 'pending' ? '[in progress]' : '[upcoming]';
      text += `${icon} ${step.step} -- ${step.date}\n`;
    }

    if (warnings.length > 0) {
      text += `\n**Important Notes:**\n`;
      for (const w of warnings) {
        text += `- ${w}\n`;
      }
    }

    text += `\nWould you like me to proceed with this refund?`;

    return {
      message: text,
      actions,
      suggestions: [
        'Yes, proceed with refund',
        'Keep my booking instead',
        'Modify instead of cancel',
        'Talk to a human agent',
      ],
      confidence: 0.91,
    };
  }

  private async handlePolicyLookup(
    message: string,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Determine which policy area to look up
    const lower = message.toLowerCase();
    let policyArea = 'general';
    if (/cancel/i.test(lower)) policyArea = 'cancellation';
    else if (/refund/i.test(lower)) policyArea = 'refund';
    else if (/modif|change|reschedule/i.test(lower)) policyArea = 'modification';
    else if (/baggage|luggage/i.test(lower)) policyArea = 'baggage';
    else if (/insurance|claim/i.test(lower)) policyArea = 'insurance';

    const policyAction: ToolAction = {
      tool: 'getPolicy',
      params: { area: policyArea },
      result: {
        policyArea,
        lastUpdated: '2026-02-01',
        policies: this.getPolicyContent(policyArea),
      },
      status: 'executed' as const,
    };
    actions.push(policyAction);

    const r = policyAction.result as Record<string, unknown>;
    const policies = r['policies'] as Array<{
      title: string;
      description: string;
      conditions: string[];
      exceptions: string[];
    }>;

    let text = `**${policyArea.charAt(0).toUpperCase() + policyArea.slice(1)} Policy**\n`;
    text += `Last updated: ${r['lastUpdated'] as string}\n\n`;

    for (const policy of policies) {
      text += `**${policy.title}**\n`;
      text += `${policy.description}\n\n`;

      if (policy.conditions.length > 0) {
        text += `Conditions:\n`;
        for (const c of policy.conditions) {
          text += `- ${c}\n`;
        }
        text += `\n`;
      }

      if (policy.exceptions.length > 0) {
        text += `Exceptions:\n`;
        for (const e of policy.exceptions) {
          text += `- ${e}\n`;
        }
        text += `\n`;
      }
    }

    text += `If you need clarification on any specific policy, just ask.`;

    return {
      message: text,
      actions,
      suggestions: [
        'Check my cancellation eligibility',
        'What about my specific booking?',
        'File a policy exception request',
        'Talk to a human agent',
      ],
      confidence: 0.88,
    };
  }

  private async handleSupportCase(
    message: string,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Classify severity based on keywords
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (/urgent|emergency|stranded|missed|safety/i.test(message)) severity = 'critical';
    else if (/overcharged|wrong.*charge|unauthorized|fraud/i.test(message)) severity = 'high';
    else if (/minor|small|question/i.test(message)) severity = 'low';

    const caseAction: ToolAction = {
      tool: 'createSupportCase',
      params: {
        userId: context.userId,
        tripId: context.tripId ?? 'trip_current',
        description: message,
        severity,
      },
      result: {
        caseId: `CASE-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        status: 'open',
        severity,
        priority: severity === 'critical' ? 1 : severity === 'high' ? 2 : severity === 'medium' ? 3 : 4,
        category: this.classifyIssueCategory(message),
        assignedTo: severity === 'critical' ? 'Senior Support Agent' : 'Support Team',
        createdAt: new Date().toISOString(),
        estimatedResponse: severity === 'critical' ? 'Within 1 hour' : severity === 'high' ? 'Within 4 hours' : 'Within 24 hours',
        nextSteps: [
          'A support agent will review your case',
          severity === 'critical' ? 'A senior agent has been notified for immediate attention' : 'You will receive an email update when your case is reviewed',
          'You can track your case status using the case ID below',
        ],
        relatedBookings: [
          { type: 'hotel', confirmationCode: 'ATL-K8M4X2', provider: 'Four Seasons Hotel' },
        ],
      },
      status: 'executed' as const,
    };
    actions.push(caseAction);

    const r = caseAction.result as Record<string, unknown>;
    const nextSteps = r['nextSteps'] as string[];

    let text = `**Support Case Created**\n\n`;
    text += `**Case ID:** ${r['caseId'] as string}\n`;
    text += `**Severity:** ${(r['severity'] as string).toUpperCase()}\n`;
    text += `**Category:** ${r['category'] as string}\n`;
    text += `**Assigned to:** ${r['assignedTo'] as string}\n`;
    text += `**Estimated response:** ${r['estimatedResponse'] as string}\n\n`;

    text += `I have created a support case for your issue. Here is what happens next:\n\n`;
    for (let i = 0; i < nextSteps.length; i++) {
      text += `${i + 1}. ${nextSteps[i]}\n`;
    }

    text += `\nPlease save your case ID (**${r['caseId'] as string}**) for reference. `;
    text += `You can check the status at any time by asking me about this case.`;

    if (severity === 'critical') {
      text += `\n\n**Note:** Due to the urgent nature of your issue, a senior support agent has been notified and will reach out shortly.`;
    }

    return {
      message: text,
      actions,
      suggestions: [
        'Add more details to this case',
        'Check case status',
        'Request a callback',
        'Check refund eligibility',
      ],
      confidence: 0.9,
    };
  }

  private async handleGeneralSupport(
    message: string,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Try a reservation lookup as default
    const lookupAction: ToolAction = {
      tool: 'lookupReservation',
      params: { userId: context.userId },
      result: {
        activeReservations: [
          {
            confirmationCode: 'ATL-K8M4X2',
            type: 'hotel',
            provider: 'Four Seasons Hotel New York Downtown',
            dates: 'Mar 20-23, 2026',
            status: 'confirmed',
          },
          {
            confirmationCode: 'AA-M7K9P3',
            type: 'flight',
            provider: 'American Airlines AA 100',
            dates: 'Mar 20, 2026',
            status: 'confirmed',
          },
          {
            confirmationCode: 'DIN-X4R8N2',
            type: 'dining',
            provider: 'Le Bernardin',
            dates: 'Mar 21, 2026 at 7:30 PM',
            status: 'confirmed',
          },
          {
            confirmationCode: 'EXP-T9W3L5',
            type: 'experience',
            provider: 'Tower of London Priority Access',
            dates: 'Mar 22, 2026 at 10:00 AM',
            status: 'confirmed',
          },
        ],
        totalReservations: 4,
      },
      status: 'executed' as const,
    };
    actions.push(lookupAction);

    const r = lookupAction.result as Record<string, unknown>;
    const reservations = r['activeReservations'] as Array<{
      confirmationCode: string; type: string; provider: string; dates: string; status: string;
    }>;

    let text = `I am here to help with any booking issues or questions. `;
    text += `Here are your active reservations:\n\n`;

    for (const res of reservations) {
      text += `- **${res.type}**: ${res.provider}\n`;
      text += `  ${res.dates} | ${res.confirmationCode} | ${res.status.toUpperCase()}\n\n`;
    }

    text += `What would you like help with? I can assist with modifications, cancellations, `;
    text += `refunds, policy questions, or filing a support case.`;

    return {
      message: text,
      actions,
      suggestions: [
        'Modify a reservation',
        'Request a refund',
        'Check cancellation policy',
        'File a complaint',
      ],
      confidence: 0.85,
    };
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private classifyIssueCategory(message: string): string {
    const lower = message.toLowerCase();
    if (/overcharg|billing|charge|payment/i.test(lower)) return 'Billing & Payments';
    if (/cancel|refund/i.test(lower)) return 'Cancellation & Refund';
    if (/modify|change|reschedule/i.test(lower)) return 'Modification';
    if (/quality|dirty|noise|broken|maintenance/i.test(lower)) return 'Service Quality';
    if (/rude|staff|service/i.test(lower)) return 'Customer Service';
    if (/lost|missing|stolen/i.test(lower)) return 'Lost & Found';
    if (/safety|security|emergency/i.test(lower)) return 'Safety & Security';
    return 'General Inquiry';
  }

  private getPolicyContent(area: string): Array<{
    title: string;
    description: string;
    conditions: string[];
    exceptions: string[];
  }> {
    switch (area) {
      case 'cancellation':
        return [
          {
            title: 'Hotel Cancellations',
            description: 'Most hotel bookings can be cancelled free of charge up to 48 hours before check-in.',
            conditions: [
              'Cancellation must be made at least 48 hours before check-in time',
              'Non-refundable rates are excluded from free cancellation',
              'Group bookings (5+ rooms) require 14 days notice',
              'Peak season bookings may have different cancellation windows',
            ],
            exceptions: [
              'Medical emergencies with documentation: full refund at any time',
              'Natural disasters at destination: full refund or free rebooking',
              'Government travel restrictions: full refund within 30 days',
            ],
          },
          {
            title: 'Flight Cancellations',
            description: 'Airline cancellation policies vary. Atlas One provides additional protection for bookings made through our platform.',
            conditions: [
              '24-hour risk-free cancellation for all flights (per DOT regulation)',
              'After 24 hours, airline cancellation fees apply',
              'Atlas One Premium members get extended 72-hour cancellation',
              'Refund is to original payment method unless otherwise requested',
            ],
            exceptions: [
              'Airline-initiated cancellations: full refund or free rebooking',
              'Significant schedule changes (>2 hours): refund eligible',
              'Force majeure events: airline rebooking or refund at airline discretion',
            ],
          },
        ];

      case 'refund':
        return [
          {
            title: 'Refund Processing',
            description: 'Refunds are processed to the original payment method within 5-10 business days.',
            conditions: [
              'Refund amount depends on cancellation policy at time of booking',
              'Service fees ($25 per booking) are non-refundable',
              'Partial refunds are available for modified bookings',
              'Loyalty points used are restored within 48 hours',
            ],
            exceptions: [
              'Atlas One Premium members: service fee waived on first refund per year',
              'Expedited refund (1-2 business days) available for verified emergencies',
              'Currency conversion fees are non-refundable',
            ],
          },
        ];

      case 'modification':
        return [
          {
            title: 'Booking Modifications',
            description: 'Most bookings can be modified up to 24 hours before the service date.',
            conditions: [
              'Date changes subject to availability and price difference',
              'Room type upgrades charged at the new rate',
              'Name changes allowed for hotels (not flights)',
              'One free modification per booking; subsequent changes may incur a fee',
            ],
            exceptions: [
              'Flexible rate bookings: unlimited free modifications',
              'Atlas One Premium: two free modifications per booking',
              'Same-day modifications may not be possible for some providers',
            ],
          },
        ];

      default:
        return [
          {
            title: 'Atlas One General Terms',
            description: 'Atlas One acts as a booking intermediary. Individual provider terms also apply.',
            conditions: [
              'All bookings are subject to availability at time of confirmation',
              'Prices are guaranteed once a booking is confirmed',
              'Atlas One reserves the right to cancel bookings suspected of fraud',
              'Communication preferences can be managed in your account settings',
            ],
            exceptions: [
              'Price guarantee: if you find a lower price within 24 hours, we match it',
              'Provider bankruptcy: Atlas One provides refund protection up to $5,000',
            ],
          },
        ];
    }
  }
}
