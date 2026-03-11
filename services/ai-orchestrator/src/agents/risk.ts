/**
 * Atlas One -- Risk Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for travel risk assessment,
 * disruption monitoring, insurance recommendations, travel advisories,
 * and health requirement checking with realistic mock data.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Risk Specialist Agent
// ---------------------------------------------------------------------------

export class RiskSpecialist implements Agent {
  name = 'risk-agent';

  description =
    'Expert in travel risk assessment, disruption monitoring, insurance coverage ' +
    'analysis, travel advisories, health requirements, and trip resilience scoring. ' +
    'Provides calm, data-driven risk analysis with actionable mitigation options.';

  systemPrompt =
    'You are the Atlas One Risk Assessment Specialist -- an expert in monitoring ' +
    'disruptions and protecting trip resilience.\n\n' +
    'Your expertise:\n' +
    '- Weather disruption monitoring and forecasting\n' +
    '- Airline operational disruption signals\n' +
    '- Venue and attraction closure tracking\n' +
    '- Travel advisory and health advisory monitoring\n' +
    '- Trip resilience scoring (composite risk metric)\n' +
    '- Insurance recommendation and coverage analysis\n' +
    '- Re-planning trigger assessment\n\n' +
    'Communication style:\n' +
    '- Calm and factual -- avoid unnecessary alarm\n' +
    '- Rate risks with clear severity levels\n' +
    '- Always pair a risk warning with a mitigation option\n' +
    '- Use data-driven assessments, not speculation\n\n' +
    'Constraints:\n' +
    '- Never downplay genuine safety concerns\n' +
    '- Always recommend appropriate insurance coverage\n' +
    '- Flag when risk data is incomplete or unverifiable';

  tools = ['checkTravelAdvisories', 'getInsuranceQuotes', 'assessDisruptions', 'getHealthRequirements'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    const isInsurance = /insurance|coverage|insure|policy|protect|claim/i.test(lower);
    const isAdvisory = /advisory|advisories|warning|warnings|safe|safety|travel.*ban|restrict/i.test(lower);
    const isHealth = /health|vaccine|vaccination|covid|visa|entry.*require|passport|document/i.test(lower);
    const isWeather = /weather|storm|hurricane|rain|snow|climate|forecast/i.test(lower);
    const isDisruption = /disruption|delay|cancel|strike|closure|risk.*assess/i.test(lower);

    if (isInsurance) {
      return this.handleInsuranceQuotes(context, actions);
    }

    if (isAdvisory) {
      return this.handleTravelAdvisories(message, actions);
    }

    if (isHealth) {
      return this.handleHealthRequirements(message, actions);
    }

    if (isWeather) {
      return this.handleWeatherRisk(message, actions);
    }

    if (isDisruption) {
      return this.handleDisruptionAssessment(context, actions);
    }

    // Default: comprehensive risk overview
    return this.handleRiskOverview(context, actions);
  }

  private async handleRiskOverview(
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const assessAction: ToolAction = {
      tool: 'assessDisruptions',
      params: { tripId: context.tripId ?? 'trip_current', userId: context.userId },
      result: {
        tripId: context.tripId ?? 'trip_current',
        overallRiskLevel: 'moderate',
        resilienceScore: 72,
        assessedAt: new Date().toISOString(),
        riskFactors: [
          {
            category: 'weather',
            severity: 'low',
            probability: 0.15,
            description: 'Chance of rain during Mar 20-23 in London',
            impact: 'May affect outdoor activities',
            mitigation: 'Indoor alternatives available; bring rain gear',
          },
          {
            category: 'flight',
            severity: 'moderate',
            probability: 0.22,
            description: 'BA LHR operations showing 18% delay rate this week',
            impact: 'Potential 1-2 hour departure delay',
            mitigation: 'Buffer time built into itinerary; alternative flights available',
          },
          {
            category: 'venue',
            severity: 'low',
            probability: 0.05,
            description: 'No known closures for booked venues',
            impact: 'Minimal',
            mitigation: 'All venues confirmed operational',
          },
          {
            category: 'health',
            severity: 'low',
            probability: 0.08,
            description: 'No active health advisories for UK',
            impact: 'No special precautions required',
            mitigation: 'Standard travel health kit recommended',
          },
          {
            category: 'geopolitical',
            severity: 'low',
            probability: 0.03,
            description: 'Stable conditions in destination region',
            impact: 'No anticipated disruptions',
            mitigation: 'Monitor news feeds; alerts enabled',
          },
        ],
        insuranceStatus: {
          covered: false,
          recommendation: 'Trip protection insurance recommended for $89',
        },
        backupPlan: {
          available: true,
          alternativeFlights: 3,
          alternativeHotels: 5,
          estimatedRebookingCost: 150,
        },
      },
      status: 'executed' as const,
    };
    actions.push(assessAction);

    const r = assessAction.result as Record<string, unknown>;
    const riskFactors = r['riskFactors'] as Array<{
      category: string; severity: string; probability: number;
      description: string; impact: string; mitigation: string;
    }>;
    const insurance = r['insuranceStatus'] as Record<string, unknown>;
    const backup = r['backupPlan'] as Record<string, unknown>;

    let text = `**Trip Risk Assessment**\n\n`;
    text += `**Overall Risk Level:** ${(r['overallRiskLevel'] as string).toUpperCase()}\n`;
    text += `**Resilience Score:** ${r['resilienceScore'] as number}/100\n\n`;

    text += `**Risk Factors:**\n\n`;
    for (const factor of riskFactors) {
      const severityIcon = factor.severity === 'low' ? '[LOW]' : factor.severity === 'moderate' ? '[MED]' : '[HIGH]';
      text += `${severityIcon} **${factor.category.charAt(0).toUpperCase() + factor.category.slice(1)}** (${Math.round(factor.probability * 100)}% probability)\n`;
      text += `  ${factor.description}\n`;
      text += `  Impact: ${factor.impact}\n`;
      text += `  Mitigation: ${factor.mitigation}\n\n`;
    }

    text += `**Insurance:** ${insurance['covered'] as boolean ? 'Active' : 'Not covered'}\n`;
    text += `${insurance['recommendation'] as string}\n\n`;

    text += `**Backup Plan:** ${(backup['available'] as boolean) ? 'Available' : 'Not configured'}\n`;
    text += `- ${backup['alternativeFlights'] as number} alternative flights identified\n`;
    text += `- ${backup['alternativeHotels'] as number} alternative hotels available\n`;
    text += `- Estimated rebooking cost: $${backup['estimatedRebookingCost'] as number}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Get insurance quotes',
        'Check travel advisories',
        'View weather forecast',
        'Create a backup plan',
      ],
      confidence: 0.9,
    };
  }

  private async handleInsuranceQuotes(
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const insuranceAction: ToolAction = {
      tool: 'getInsuranceQuotes',
      params: { tripId: context.tripId ?? 'trip_current', userId: context.userId },
      result: {
        tripValue: 3500,
        currency: 'USD',
        destination: 'United Kingdom',
        travelDates: { start: '2026-03-20', end: '2026-03-23' },
        travelers: 2,
        quotes: [
          {
            id: 'ins_basic',
            provider: 'Atlas Shield Basic',
            premium: 49,
            premiumPerPerson: 24.50,
            coverage: {
              tripCancellation: 3500,
              tripInterruption: 3500,
              medicalEmergency: 50000,
              emergencyEvacuation: 100000,
              baggageLoss: 1000,
              travelDelay: 500,
            },
            highlights: [
              'Trip cancellation and interruption',
              'Emergency medical coverage',
              'Baggage loss protection',
              '24/7 assistance hotline',
            ],
            exclusions: [
              'Pre-existing conditions',
              'Extreme sports/activities',
              'Cancel for any reason',
            ],
            rating: 4.2,
            reviewCount: 8934,
          },
          {
            id: 'ins_premium',
            provider: 'Atlas Shield Premium',
            premium: 89,
            premiumPerPerson: 44.50,
            coverage: {
              tripCancellation: 5000,
              tripInterruption: 5000,
              medicalEmergency: 250000,
              emergencyEvacuation: 500000,
              baggageLoss: 2500,
              travelDelay: 1500,
              cancelForAnyReason: 2500,
              flightAccidentInsurance: 100000,
            },
            highlights: [
              'Cancel for any reason (75% reimbursement)',
              'Enhanced medical and evacuation',
              'Flight accident coverage',
              'Higher baggage and delay limits',
              'Pre-existing condition waiver',
              'Concierge medical referral service',
            ],
            exclusions: [
              'Intentional self-harm',
              'Acts of war in active conflict zones',
            ],
            rating: 4.7,
            reviewCount: 12567,
          },
          {
            id: 'ins_comprehensive',
            provider: 'Atlas Shield Platinum',
            premium: 149,
            premiumPerPerson: 74.50,
            coverage: {
              tripCancellation: 10000,
              tripInterruption: 10000,
              medicalEmergency: 1000000,
              emergencyEvacuation: 1000000,
              baggageLoss: 5000,
              travelDelay: 3000,
              cancelForAnyReason: 5000,
              flightAccidentInsurance: 500000,
              rentalCarDamage: 50000,
              identityTheft: 25000,
            },
            highlights: [
              'Maximum coverage on all categories',
              'Rental car damage waiver included',
              'Identity theft protection',
              'Cancel for any reason (100% reimbursement)',
              'Unlimited emergency medical',
              'Private medical evacuation',
              'Travel concierge service',
            ],
            exclusions: [
              'Intentional self-harm',
            ],
            rating: 4.9,
            reviewCount: 5234,
          },
        ],
        recommendation: 'ins_premium',
        recommendationReason: 'Best balance of coverage and value for your London trip.',
      },
      status: 'executed' as const,
    };
    actions.push(insuranceAction);

    const r = insuranceAction.result as Record<string, unknown>;
    const quotes = r['quotes'] as Array<{
      id: string; provider: string; premium: number; premiumPerPerson: number;
      coverage: Record<string, number>; highlights: string[]; exclusions: string[];
      rating: number; reviewCount: number;
    }>;

    let text = `**Travel Insurance Quotes**\n\n`;
    text += `Trip Value: $${r['tripValue'] as number} | Destination: ${r['destination'] as string}\n`;
    text += `Dates: ${(r['travelDates'] as Record<string, string>)['start']} to ${(r['travelDates'] as Record<string, string>)['end']} | Travelers: ${r['travelers'] as number}\n\n`;

    for (const quote of quotes) {
      const isRecommended = quote.id === (r['recommendation'] as string);
      text += `${isRecommended ? '>> ' : ''}**${quote.provider}** -- $${quote.premium}${isRecommended ? ' (RECOMMENDED)' : ''}\n`;
      text += `   Per person: $${quote.premiumPerPerson} | Rating: ${quote.rating}/5 (${quote.reviewCount.toLocaleString()} reviews)\n`;
      text += `   Key coverage:\n`;
      text += `   - Trip cancellation: $${quote.coverage['tripCancellation'].toLocaleString()}\n`;
      text += `   - Medical emergency: $${quote.coverage['medicalEmergency'].toLocaleString()}\n`;
      text += `   - Baggage loss: $${quote.coverage['baggageLoss'].toLocaleString()}\n`;
      text += `   Highlights: ${quote.highlights.slice(0, 3).join(', ')}\n`;
      if (quote.exclusions.length > 0) {
        text += `   Exclusions: ${quote.exclusions.join(', ')}\n`;
      }
      text += `\n`;
    }

    text += `**Recommendation:** ${r['recommendationReason'] as string}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Purchase the recommended plan',
        'Compare coverage in detail',
        'Show full risk assessment',
        'Skip insurance for now',
      ],
      confidence: 0.92,
    };
  }

  private async handleTravelAdvisories(
    message: string,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Try to extract a destination from the message
    const destinationMatch = message.match(/(?:to|for|in|about)\s+(\w[\w\s]*?)(?:\?|$|,|\.|!)/i);
    const destination = destinationMatch ? destinationMatch[1].trim() : 'United Kingdom';

    const advisoryAction: ToolAction = {
      tool: 'checkTravelAdvisories',
      params: { destination },
      result: {
        destination,
        country: destination,
        overallLevel: 'Level 1 - Exercise Normal Precautions',
        lastUpdated: '2026-03-08',
        source: 'US Department of State',
        advisories: [
          {
            type: 'general',
            level: 'low',
            title: 'Standard Travel Advisory',
            description: `Exercise normal precautions in ${destination}. The country is generally safe for tourists.`,
            effectiveDate: '2026-01-15',
            regions: ['Nationwide'],
          },
          {
            type: 'health',
            level: 'low',
            title: 'Routine Vaccinations',
            description: 'Ensure routine vaccinations are up to date. No special health warnings in effect.',
            effectiveDate: '2026-02-01',
            regions: ['Nationwide'],
          },
          {
            type: 'security',
            level: 'low',
            title: 'Standard Security Awareness',
            description: 'Be aware of pickpocketing in tourist areas and on public transport. Avoid demonstrations.',
            effectiveDate: '2026-01-01',
            regions: ['London', 'Manchester', 'Edinburgh'],
          },
        ],
        entryRequirements: {
          visaRequired: false,
          visaType: 'Visa waiver (6 months for US citizens)',
          passportValidity: 'Must be valid for duration of stay',
          covidRestrictions: 'None',
          customsDeclaration: 'Standard EU customs form',
        },
        emergencyContacts: {
          localEmergency: '999',
          usEmbassy: '+44-20-7499-9000',
          atlasOneEmergency: '+1-888-555-ATLAS',
        },
      },
      status: 'executed' as const,
    };
    actions.push(advisoryAction);

    const r = advisoryAction.result as Record<string, unknown>;
    const advisories = r['advisories'] as Array<{
      type: string; level: string; title: string; description: string;
      effectiveDate: string; regions: string[];
    }>;
    const entry = r['entryRequirements'] as Record<string, unknown>;
    const emergency = r['emergencyContacts'] as Record<string, string>;

    let text = `**Travel Advisory: ${r['destination'] as string}**\n\n`;
    text += `**Overall Level:** ${r['overallLevel'] as string}\n`;
    text += `Source: ${r['source'] as string} | Updated: ${r['lastUpdated'] as string}\n\n`;

    text += `**Current Advisories:**\n\n`;
    for (const adv of advisories) {
      const levelIcon = adv.level === 'low' ? '[LOW]' : adv.level === 'moderate' ? '[MED]' : '[HIGH]';
      text += `${levelIcon} **${adv.title}**\n`;
      text += `${adv.description}\n`;
      text += `Regions: ${adv.regions.join(', ')} | Since: ${adv.effectiveDate}\n\n`;
    }

    text += `**Entry Requirements:**\n`;
    text += `- Visa: ${entry['visaRequired'] as boolean ? (entry['visaType'] as string) : `Not required (${entry['visaType'] as string})`}\n`;
    text += `- Passport: ${entry['passportValidity'] as string}\n`;
    text += `- COVID: ${entry['covidRestrictions'] as string}\n\n`;

    text += `**Emergency Contacts:**\n`;
    text += `- Local emergency: ${emergency['localEmergency']}\n`;
    text += `- US Embassy: ${emergency['usEmbassy']}\n`;
    text += `- Atlas One 24/7: ${emergency['atlasOneEmergency']}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Check health requirements',
        'Get insurance quotes',
        'View weather forecast',
        'Show full risk assessment',
      ],
      confidence: 0.93,
    };
  }

  private async handleHealthRequirements(
    message: string,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const destinationMatch = message.match(/(?:to|for|in|about)\s+(\w[\w\s]*?)(?:\?|$|,|\.|!)/i);
    const destination = destinationMatch ? destinationMatch[1].trim() : 'United Kingdom';

    const healthAction: ToolAction = {
      tool: 'getHealthRequirements',
      params: { destination, origin: 'United States' },
      result: {
        destination,
        origin: 'United States',
        lastUpdated: '2026-03-05',
        requiredVaccinations: [],
        recommendedVaccinations: [
          {
            vaccine: 'Routine vaccinations (MMR, DPT, Polio)',
            status: 'recommended',
            notes: 'Ensure all routine vaccinations are up to date',
          },
          {
            vaccine: 'Hepatitis B',
            status: 'recommended',
            notes: 'Recommended for most travelers',
          },
          {
            vaccine: 'Influenza',
            status: 'recommended',
            notes: 'Seasonal flu may be circulating during your travel dates',
          },
        ],
        covidRequirements: {
          vaccinationRequired: false,
          testingRequired: false,
          quarantineRequired: false,
          maskMandate: false,
          notes: 'No COVID-19 restrictions currently in effect.',
        },
        healthRisks: [
          {
            risk: 'Seasonal allergies',
            severity: 'low',
            description: 'Pollen levels may be elevated in late March',
            precaution: 'Bring allergy medication if sensitive',
          },
          {
            risk: 'Food safety',
            severity: 'low',
            description: 'Tap water is safe to drink throughout the UK',
            precaution: 'Standard food hygiene applies',
          },
        ],
        medicalFacilities: {
          quality: 'Excellent',
          nhsAccess: 'Emergency NHS services available to visitors',
          pharmacies: 'Widely available; Boots and Superdrug chains throughout London',
          travelInsuranceAdvised: true,
          notes: 'Private medical care is expensive; travel insurance strongly recommended.',
        },
        travelHealthKit: [
          'Prescription medications (with documentation)',
          'Basic first aid supplies',
          'Allergy medication',
          'Motion sickness tablets',
          'Pain relief (paracetamol/ibuprofen)',
          'Hand sanitizer',
          'Sunscreen',
        ],
      },
      status: 'executed' as const,
    };
    actions.push(healthAction);

    const r = healthAction.result as Record<string, unknown>;
    const recommended = r['recommendedVaccinations'] as Array<{
      vaccine: string; status: string; notes: string;
    }>;
    const covid = r['covidRequirements'] as Record<string, unknown>;
    const risks = r['healthRisks'] as Array<{
      risk: string; severity: string; description: string; precaution: string;
    }>;
    const medical = r['medicalFacilities'] as Record<string, unknown>;
    const healthKit = r['travelHealthKit'] as string[];

    let text = `**Health Requirements: ${r['destination'] as string}**\n`;
    text += `From: ${r['origin'] as string} | Updated: ${r['lastUpdated'] as string}\n\n`;

    const required = r['requiredVaccinations'] as Array<unknown>;
    if (required.length > 0) {
      text += `**Required Vaccinations:** See list below\n\n`;
    } else {
      text += `**Required Vaccinations:** None\n\n`;
    }

    text += `**Recommended Vaccinations:**\n`;
    for (const vax of recommended) {
      text += `- ${vax.vaccine}: ${vax.notes}\n`;
    }
    text += `\n`;

    text += `**COVID-19 Requirements:**\n`;
    text += `- Vaccination required: ${covid['vaccinationRequired'] as boolean ? 'Yes' : 'No'}\n`;
    text += `- Testing required: ${covid['testingRequired'] as boolean ? 'Yes' : 'No'}\n`;
    text += `- Quarantine: ${covid['quarantineRequired'] as boolean ? 'Yes' : 'No'}\n`;
    text += `- ${covid['notes'] as string}\n\n`;

    text += `**Health Risks:**\n`;
    for (const risk of risks) {
      text += `- ${risk.risk} (${risk.severity}): ${risk.description}. ${risk.precaution}\n`;
    }
    text += `\n`;

    text += `**Medical Facilities:**\n`;
    text += `- Quality: ${medical['quality'] as string}\n`;
    text += `- NHS: ${medical['nhsAccess'] as string}\n`;
    text += `- Pharmacies: ${medical['pharmacies'] as string}\n`;
    text += `- ${medical['notes'] as string}\n\n`;

    text += `**Recommended Travel Health Kit:**\n`;
    for (const item of healthKit) {
      text += `- ${item}\n`;
    }

    return {
      message: text,
      actions,
      suggestions: [
        'Get insurance quotes',
        'Check travel advisories',
        'Show entry requirements',
        'View full risk assessment',
      ],
      confidence: 0.91,
    };
  }

  private async handleWeatherRisk(
    message: string,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const destinationMatch = message.match(/(?:in|at|for)\s+(\w[\w\s]*?)(?:\?|$|,|\.|!)/i);
    const destination = destinationMatch ? destinationMatch[1].trim() : 'London';

    const weatherAction: ToolAction = {
      tool: 'assessDisruptions',
      params: { category: 'weather', destination },
      result: {
        destination,
        period: 'Mar 20-23, 2026',
        overallWeatherRisk: 'low',
        forecast: [
          {
            date: '2026-03-20',
            condition: 'Partly cloudy',
            highTemp: 12,
            lowTemp: 6,
            precipitation: 20,
            wind: '15 km/h',
            impactOnPlans: 'Good conditions for outdoor activities',
          },
          {
            date: '2026-03-21',
            condition: 'Light rain',
            highTemp: 10,
            lowTemp: 5,
            precipitation: 65,
            wind: '20 km/h',
            impactOnPlans: 'Rain likely in afternoon; consider indoor alternatives',
          },
          {
            date: '2026-03-22',
            condition: 'Overcast',
            highTemp: 11,
            lowTemp: 4,
            precipitation: 30,
            wind: '12 km/h',
            impactOnPlans: 'Manageable; bring a light jacket',
          },
          {
            date: '2026-03-23',
            condition: 'Sunny intervals',
            highTemp: 13,
            lowTemp: 7,
            precipitation: 10,
            wind: '10 km/h',
            impactOnPlans: 'Good departure day conditions',
          },
        ],
        weatherAlerts: [],
        recommendations: [
          'Pack layers and a waterproof jacket',
          'Mar 21 may need indoor backup plan (65% rain chance)',
          'All other days look favorable for planned activities',
          'No severe weather warnings in effect',
        ],
        affectedBookings: [
          {
            booking: 'Royal London Bike Tour',
            date: '2026-03-21',
            weatherSensitive: true,
            recommendation: 'Consider rescheduling to Mar 20 or 22 if rain is confirmed',
          },
        ],
      },
      status: 'executed' as const,
    };
    actions.push(weatherAction);

    const r = weatherAction.result as Record<string, unknown>;
    const forecast = r['forecast'] as Array<{
      date: string; condition: string; highTemp: number; lowTemp: number;
      precipitation: number; wind: string; impactOnPlans: string;
    }>;
    const recommendations = r['recommendations'] as string[];
    const affected = r['affectedBookings'] as Array<{
      booking: string; date: string; weatherSensitive: boolean; recommendation: string;
    }>;

    let text = `**Weather Risk Assessment: ${r['destination'] as string}**\n`;
    text += `Period: ${r['period'] as string} | Overall Risk: ${(r['overallWeatherRisk'] as string).toUpperCase()}\n\n`;

    text += `**Forecast:**\n\n`;
    for (const day of forecast) {
      const rainIcon = day.precipitation >= 50 ? '[RAIN]' : day.precipitation >= 30 ? '[MIXED]' : '[CLEAR]';
      text += `**${day.date}** ${rainIcon}\n`;
      text += `  ${day.condition} | ${day.lowTemp}-${day.highTemp}C | Rain: ${day.precipitation}% | Wind: ${day.wind}\n`;
      text += `  ${day.impactOnPlans}\n\n`;
    }

    if (affected.length > 0) {
      text += `**Weather-Sensitive Bookings:**\n`;
      for (const a of affected) {
        text += `- **${a.booking}** (${a.date})\n`;
        text += `  ${a.recommendation}\n`;
      }
      text += `\n`;
    }

    text += `**Recommendations:**\n`;
    for (const rec of recommendations) {
      text += `- ${rec}\n`;
    }

    return {
      message: text,
      actions,
      suggestions: [
        'Reschedule the bike tour',
        'Show indoor alternatives for Mar 21',
        'Get insurance for weather disruption',
        'Show full risk assessment',
      ],
      confidence: 0.89,
    };
  }

  private async handleDisruptionAssessment(
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const disruptionAction: ToolAction = {
      tool: 'assessDisruptions',
      params: { tripId: context.tripId ?? 'trip_current', userId: context.userId },
      result: {
        tripId: context.tripId ?? 'trip_current',
        assessedAt: new Date().toISOString(),
        activeDisruptions: [
          {
            id: 'dis_001',
            type: 'airline_operational',
            severity: 'moderate',
            description: 'British Airways reporting 18% delay rate at Heathrow due to runway maintenance',
            affectedBooking: 'BA 178 JFK-LHR (Mar 20)',
            probability: 0.22,
            potentialImpact: 'Delay of 30-120 minutes',
            status: 'monitoring',
            mitigations: [
              'Atlas One monitoring flight status in real-time',
              'Alternative flight AA 100 departs 2h earlier (available)',
              'Travel insurance covers delay over 3 hours',
            ],
          },
        ],
        potentialDisruptions: [
          {
            id: 'dis_002',
            type: 'transport_strike',
            severity: 'low',
            description: 'London Underground workers ballot for potential strike action week of Mar 23',
            affectedBooking: 'Ground transport during stay',
            probability: 0.12,
            potentialImpact: 'Reduced tube service; bus/taxi alternatives available',
            status: 'watching',
            mitigations: [
              'Uber/taxi readily available in London',
              'Walking distances between central London attractions',
              'Strike decision expected by Mar 15',
            ],
          },
          {
            id: 'dis_003',
            type: 'venue_capacity',
            severity: 'low',
            description: 'Tower of London expected high capacity due to school holidays',
            affectedBooking: 'Tower of London Priority Access (Mar 22)',
            probability: 0.35,
            potentialImpact: 'Longer queues despite priority access; crowded interior',
            status: 'informational',
            mitigations: [
              'Priority access booking confirmed -- skip main queue',
              'Early morning slot recommended (opening time)',
              'Beefeater tour groups managed separately',
            ],
          },
        ],
        tripResilienceScore: {
          overall: 72,
          breakdown: {
            flightResilience: 68,
            accommodationResilience: 90,
            activityResilience: 75,
            transportResilience: 70,
          },
          improvements: [
            'Add travel insurance (+8 points)',
            'Book an alternative flight option (+5 points)',
            'Add indoor backup activities (+3 points)',
          ],
        },
      },
      status: 'executed' as const,
    };
    actions.push(disruptionAction);

    const r = disruptionAction.result as Record<string, unknown>;
    const active = r['activeDisruptions'] as Array<{
      id: string; type: string; severity: string; description: string;
      affectedBooking: string; probability: number; potentialImpact: string;
      status: string; mitigations: string[];
    }>;
    const potential = r['potentialDisruptions'] as Array<{
      id: string; type: string; severity: string; description: string;
      affectedBooking: string; probability: number; potentialImpact: string;
      status: string; mitigations: string[];
    }>;
    const resilience = r['tripResilienceScore'] as Record<string, unknown>;
    const resBreakdown = resilience['breakdown'] as Record<string, number>;
    const improvements = resilience['improvements'] as string[];

    let text = `**Disruption Assessment**\n\n`;

    if (active.length > 0) {
      text += `**Active Disruptions:**\n\n`;
      for (const d of active) {
        const icon = d.severity === 'high' ? '[HIGH]' : d.severity === 'moderate' ? '[MED]' : '[LOW]';
        text += `${icon} **${d.description}**\n`;
        text += `  Affects: ${d.affectedBooking}\n`;
        text += `  Probability: ${Math.round(d.probability * 100)}% | Impact: ${d.potentialImpact}\n`;
        text += `  Status: ${d.status.toUpperCase()}\n`;
        text += `  Mitigations:\n`;
        for (const m of d.mitigations) {
          text += `  - ${m}\n`;
        }
        text += `\n`;
      }
    }

    if (potential.length > 0) {
      text += `**Potential Disruptions:**\n\n`;
      for (const d of potential) {
        const icon = d.severity === 'high' ? '[HIGH]' : d.severity === 'moderate' ? '[MED]' : '[LOW]';
        text += `${icon} **${d.description}**\n`;
        text += `  Affects: ${d.affectedBooking} | Probability: ${Math.round(d.probability * 100)}%\n`;
        text += `  Mitigations: ${d.mitigations[0]}\n\n`;
      }
    }

    text += `**Trip Resilience Score: ${resilience['overall'] as number}/100**\n`;
    text += `- Flights: ${resBreakdown['flightResilience']}/100\n`;
    text += `- Accommodation: ${resBreakdown['accommodationResilience']}/100\n`;
    text += `- Activities: ${resBreakdown['activityResilience']}/100\n`;
    text += `- Transport: ${resBreakdown['transportResilience']}/100\n\n`;

    text += `**Ways to improve resilience:**\n`;
    for (const imp of improvements) {
      text += `- ${imp}\n`;
    }

    return {
      message: text,
      actions,
      suggestions: [
        'Book the alternative flight',
        'Get insurance coverage',
        'Show indoor backup plans',
        'Set up disruption alerts',
      ],
      confidence: 0.91,
    };
  }
}
