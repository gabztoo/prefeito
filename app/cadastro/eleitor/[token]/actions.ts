"use server";

import { completeVoterRegistration } from "@/lib/services/registration";
import { ActionResult } from "@/lib/types";

export async function submitVoterRegistrationAction(data: {
  token: string;
  name: string;
  motherName: string;
  birthDate: string;
  phone: string;
  zone: string;
  section: string;
  voterTitle: string;
}): Promise<ActionResult<{ id: string }>> {
  return completeVoterRegistration({
    token: data.token,
    name: data.name,
    motherName: data.motherName,
    birthDate: data.birthDate,
    phone: data.phone,
    zone: data.zone,
    section: data.section,
    voterTitle: data.voterTitle,
  });
}
