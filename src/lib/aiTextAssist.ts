/**
 * AI-ASSIST-1 — Context-aware text generation for form fields
 *
 * Demo mode: returns pre-crafted template text locally (no API call).
 * Production: calls ai-text-assist edge function (Claude Sonnet 4.5).
 */

import { supabase } from './supabase';

// ── Main export ───────────────────────────────────────────────

export async function generateFieldText(
  fieldLabel: string,
  context: Record<string, any>,
  isDemoMode: boolean,
): Promise<string> {
  if (isDemoMode) {
    // Simulate brief network delay for realism
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    return generateDemoText(fieldLabel, context);
  }

  // Production: call edge function
  const { data, error } = await supabase.functions.invoke('ai-text-assist', {
    body: { fieldLabel, context },
  });

  if (error) throw error;
  if (!data?.text) throw new Error('No text returned');
  return data.text;
}

// ── Demo text generator ───────────────────────────────────────

function generateDemoText(fieldLabel: string, ctx: Record<string, any>): string {
  const label = fieldLabel.toLowerCase();
  const title = (ctx.title || ctx.name || '').toLowerCase();
  const severity = ctx.severity || '';
  const category = ctx.category || '';
  const location = ctx.location || ctx.locationName || '';
  const source = ctx.source || '';

  // ── Corrective action fields ──
  if (label.includes('description') || label.includes('what happened')) {
    if (title.includes('temperature') || title.includes('cooler') || title.includes('holding')) {
      return `${location || 'Unit'} recorded out-of-range temperature during routine check. ${severity === 'critical' ? 'Immediate corrective action was initiated.' : 'Staff was notified and monitoring frequency increased.'} All affected TCS products were evaluated per FDA Food Code requirements.`;
    }
    if (title.includes('handwash') || title.includes('soap')) {
      return `Handwashing station in prep area found without adequate soap supply during ${source || 'morning inspection'}. Station was immediately restocked and all other handwashing stations were verified.`;
    }
    if (title.includes('pest') || title.includes('rodent') || title.includes('insect')) {
      return `Evidence of pest activity observed in ${location || 'storage area'} during routine inspection. Area was documented and pest control vendor contacted for emergency service.`;
    }
    if (title.includes('hood') || title.includes('suppression') || title.includes('fire')) {
      return `${location || 'Facility'} fire suppression system inspection certificate has expired. Vendor has been contacted to schedule re-inspection per NFPA 96 requirements.`;
    }
    if (title.includes('cross') || title.includes('contamination') || title.includes('cutting')) {
      return `Cross-contamination risk identified during prep operations. Raw proteins and ready-to-eat items were not properly separated. Staff retrained on color-coded cutting board protocol.`;
    }
    if (title.includes('training') || title.includes('certification') || title.includes('handler')) {
      return `Training documentation review identified ${ctx.count || 'one or more'} staff members with expired or missing required certifications. Renewal has been scheduled with approved provider.`;
    }
    // Generic description
    return `${title ? capitalize(title) + ' identified' : 'Issue identified'} at ${location || 'this location'} during ${source || 'routine operations'}. ${severity === 'critical' ? 'Immediate action was taken to address the finding.' : 'Issue was documented and assigned for resolution.'}`;
  }

  if (label.includes('root cause') || label.includes('why')) {
    if (title.includes('temperature') || title.includes('cooler')) {
      return 'Door gasket deterioration allowing warm air infiltration. Compressor cycling intermittently, suggesting potential refrigerant issue or thermostat drift.';
    }
    if (title.includes('pest')) {
      return 'Gap identified in exterior wall near receiving dock allowing pest entry. Sanitation schedule for the area had lapsed due to staffing changes.';
    }
    if (title.includes('hood') || title.includes('fire') || title.includes('suppression')) {
      return 'Annual inspection not scheduled due to vendor contract lapse. No automated reminder system in place for facility safety certifications.';
    }
    if (title.includes('handwash') || title.includes('soap')) {
      return 'Closing crew did not complete restocking checklist. Soap dispenser supply not included in weekly inventory count.';
    }
    return `${category === 'facility_safety' ? 'Maintenance schedule gap and lack of automated reminders.' : 'Process deviation due to staffing changes or training gap.'} Contributing factors being evaluated for preventive action.`;
  }

  if (label.includes('corrective action') || label.includes('action taken') || label.includes('immediate action')) {
    if (title.includes('temperature') || title.includes('cooler') || title.includes('holding')) {
      return 'Moved all TCS products to backup unit immediately. Discarded items above threshold for more than 4 hours per FDA Food Code. Placed out-of-order sign on unit. Called refrigeration vendor for emergency repair.';
    }
    if (title.includes('handwash') || title.includes('soap')) {
      return 'Restocked all handwashing stations with soap and paper towels. Verified warm water supply at each station. Added soap level check to closing checklist.';
    }
    if (title.includes('pest')) {
      return 'Sealed identified entry point with expanding foam as temporary measure. Scheduled pest control vendor for emergency treatment. Increased sanitation frequency in affected area.';
    }
    return `Immediate containment actions taken. ${severity === 'critical' ? 'Area secured and affected products isolated.' : 'Issue documented and staff notified.'} Corrective measures initiated per standard operating procedure.`;
  }

  if (label.includes('corrective action plan') || label.includes('preventive') || label.includes('prevention') || label.includes('follow-up')) {
    if (title.includes('temperature')) {
      return 'Replace door gasket within 48 hours. Install door alarm sensor to alert when open more than 2 minutes. Retrain staff on door discipline during prep. Add gasket inspection to monthly equipment checklist.';
    }
    return `Implement preventive controls to address root cause. Update relevant SOP and retrain affected staff within 7 days. Add recurring check to ${category === 'facility_safety' ? 'facility maintenance' : 'daily operations'} checklist. Schedule follow-up verification within ${severity === 'critical' ? '48 hours' : '2 weeks'}.`;
  }

  if (label.includes('resolution') || label.includes('resolved')) {
    return `Issue resolved through corrective action. Root cause addressed and preventive measures implemented. Staff briefed on updated procedures. Follow-up verification scheduled to confirm effectiveness.`;
  }

  // ── HACCP-specific fields ──
  if (label.includes('hazard') && (label.includes('description') || label === 'hazard')) {
    return 'Biological hazard — potential pathogen growth if product temperature exceeds critical limit during holding, storage, or preparation. Risk increases with extended time in temperature danger zone (41\u00B0F-135\u00B0F).';
  }
  if (label.includes('control measure') || label.includes('preventive measure')) {
    return 'Verify product temperature at each critical control point using calibrated thermometer. Maintain cold holding at 41\u00B0F or below. Maintain hot holding at 135\u00B0F or above. Document all readings on monitoring log.';
  }
  if (label.includes('monitoring') && label.includes('procedure')) {
    return 'Check and record temperature every 2 hours during holding using calibrated probe thermometer. Record reading, time, initials, and any corrective action on monitoring log.';
  }
  if (label.includes('verification')) {
    return 'Review monitoring logs daily for completeness and accuracy. Calibrate thermometers weekly using ice-point method. Conduct monthly internal audit of CCP records.';
  }
  if (label.includes('product description')) {
    return 'Prepared food products including proteins, dairy, and produce processed in commercial kitchen environment. Products are received, stored, prepped, cooked, held, and served to consumers.';
  }
  if (label.includes('raw material') || label.includes('ingredient')) {
    return 'Fresh and frozen proteins (chicken, beef, seafood)\nDairy products (milk, cheese, cream)\nFresh produce (lettuce, tomatoes, onions)\nDry goods (flour, rice, pasta)\nCanned goods and sauces';
  }
  if (label.includes('packaging')) {
    return 'Single-use food service containers (hot and cold)\nPlastic wrap and aluminum foil\nTo-go containers with tamper-evident seals\nLabeled prep containers with date marking';
  }
  if (label.includes('intended use')) {
    return 'Products are prepared for immediate consumption by restaurant patrons. Some items may be held for extended service periods. Take-out items are packaged for transport and consumption within 2-4 hours.';
  }
  if (label.includes('target population')) {
    return 'General public including adults and children. May include individuals with food allergies or sensitivities. Menu allergen information is posted and staff are trained on allergen awareness.';
  }
  if (label.includes('special consideration')) {
    return 'Big 9 allergens present in multiple menu items — allergen matrix maintained and updated with menu changes. Vulnerable populations (children, elderly) may be served. Seasonal menu changes require HACCP plan review.';
  }
  if (label.includes('processing aid')) {
    return 'Sanitizing solutions (quaternary ammonium, chlorine-based)\nCooking oils and sprays\nFood-grade lubricants for equipment';
  }
  if (label.includes('deviation')) {
    return `CCP monitoring log shows ${ctx.parameter || 'critical parameter'} outside established limits. Deviation detected during ${ctx.time || 'routine monitoring'} and documented per HACCP plan corrective action procedure.`;
  }

  // ── Temperature notes ──
  if (label.includes('notes') || label.includes('comment') || label.includes('observation')) {
    if (ctx.temperature !== undefined || ctx.equipmentName || title.includes('temp')) {
      const temp = ctx.temperature || ctx.reading;
      if (temp) {
        return `Reading of ${temp}\u00B0F recorded. ${ctx.status === 'out_of_range' || ctx.outOfRange ? 'Unit running outside acceptable range. Compressor cycling observed. Vendor notified.' : 'Unit operating within normal parameters. No issues observed.'}`;
      }
      return 'Temperature check completed. Equipment operating within normal parameters. No corrective action needed at this time.';
    }
    if (ctx.checklistItem || ctx.itemName) {
      return `${ctx.itemName || 'Item'} inspected and ${ctx.status === 'fail' ? 'found non-compliant. Corrective action initiated.' : 'verified compliant. No issues noted.'}`;
    }
    if (source.includes('vendor') || source.includes('service') || ctx.vendorName) {
      return `${ctx.vendorName || 'Vendor'} completed scheduled service. All work performed per service agreement. Documentation uploaded. Next service due per regular schedule.`;
    }
    return `Observation documented during ${source || 'routine operations'}. ${location ? 'Location: ' + location + '. ' : ''}No immediate safety concerns identified.`;
  }

  // ── Calendar / event fields ──
  if (label.includes('detail') && (label.includes('vendor') || label.includes('change'))) {
    return `Previous vendor ${ctx.previousVendor || ''} did not meet service level requirements — missed ${ctx.missedCount || 'multiple'} scheduled appointments. New vendor selected based on availability, certification, and references.`;
  }
  if (label.includes('detail') && (label.includes('frequency') || label.includes('reduction'))) {
    return `Service frequency reduction justified by decreased cooking volume and seasonal schedule change. Reviewed with fire marshal / health department as applicable. Will reassess at end of period.`;
  }
  if (label.includes('description') && (ctx.eventType || ctx.type || label.includes('event'))) {
    return `${ctx.eventType || 'Scheduled service'} at ${location || 'facility'}. ${ctx.vendorName ? 'Vendor: ' + ctx.vendorName + '. ' : ''}Access required: ${ctx.accessNotes || 'coordinate with on-site manager for after-hours access.'}`;
  }

  // ── Equipment / maintenance ──
  if (label.includes('maintenance') || label.includes('service') || label.includes('warranty')) {
    if (label.includes('warranty')) {
      return `${ctx.manufacturer || 'Manufacturer'} warranty covers parts and labor. Purchased through authorized dealer. Retain all service records for warranty claims. Contact vendor for warranty service requests.`;
    }
    return `Completed scheduled maintenance per manufacturer specifications. ${ctx.equipmentName ? ctx.equipmentName + ': ' : ''}All components inspected, cleaned, and tested. Equipment returned to full operation. Next scheduled service per maintenance calendar.`;
  }

  // ── Training ──
  if (label.includes('training') || label.includes('completion') || label.includes('instruction')) {
    return `${ctx.employeeName || 'Employee'} completed ${ctx.courseName || 'required training'} session. ${ctx.score ? 'Assessment score: ' + ctx.score + '%. ' : ''}Certificate issued and filed. Renewal due per regulatory schedule.`;
  }

  // ── Playbook / incident ──
  if (label.includes('skip reason') || label.includes('abandon reason')) {
    return `Step ${label.includes('skip') ? 'skipped' : 'abandoned'} due to ${ctx.reason || 'operational constraints'}. Documented for review. Alternative procedures followed where applicable.`;
  }
  if (label.includes('step') && label.includes('instruction')) {
    return `${ctx.stepNumber ? 'Step ' + ctx.stepNumber + ': ' : ''}${ctx.stepTitle || 'Complete this action'} following standard operating procedure. Document completion with photo evidence if applicable. Notify supervisor upon completion.`;
  }

  // ── Document description ──
  if (label.includes('document')) {
    return `${ctx.documentType || 'Document'} uploaded for ${ctx.vendorName || 'vendor'} compliance records. ${ctx.expirationDate ? 'Valid through ' + ctx.expirationDate + '. ' : ''}Filed in document management system for regulatory reference.`;
  }

  // ── Personal message / note ──
  if (label.includes('personal') || label.includes('message')) {
    return `I wanted to share this with you — it's been valuable for our operations and I think you'd find it helpful too. Let me know if you have any questions.`;
  }

  // ── Support / help ──
  if (label.includes('issue') && (label.includes('describe') || label.includes('support'))) {
    return `Experiencing an issue with ${ctx.feature || 'the application'}. ${ctx.steps ? 'Steps to reproduce: ' + ctx.steps : 'Issue occurs during normal usage.'} Expected behavior differs from actual behavior. Screenshots attached if applicable.`;
  }

  // ── Flag / rejection ──
  if (label.includes('flag') || label.includes('reject') || label.includes('reason')) {
    return `${ctx.documentType || 'Document'} does not meet requirements. ${ctx.flagCategory === 'expired_cert' ? 'Certificate has expired.' : ctx.flagCategory === 'illegible' ? 'Document is not legible.' : 'Please review and resubmit with corrections.'}`;
  }

  // ── Regulatory ──
  if (label.includes('summary') || label.includes('operator') || label.includes('regulatory')) {
    return `This regulatory update affects ${ctx.jurisdiction || 'local'} food service operations. Operators should review current procedures and update SOPs as needed to maintain compliance. Implementation deadline should be tracked in the compliance calendar.`;
  }

  // ── Generic fallback ──
  return `${capitalize(fieldLabel)} documented for ${location || 'this location'}. Details recorded per standard operating procedure. ${severity === 'critical' ? 'Flagged for immediate review.' : 'Available for review in compliance records.'}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
