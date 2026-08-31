"use server";

import { completeLeaderRegistration } from "@/lib/services/registration";

export async function submitLeaderRegistrationAction(
  token: string,
  data: {
    name: string;
    email: string;
    password: string;
    cpf?: string;
    address?: string;
    cep?: string;
    zone?: string;
    section?: string;
    voterTitle?: string;
    localAtuacao?: string;
  }
) {
  return completeLeaderRegistration({
    token,
    name: data.name,
    email: data.email,
    password: data.password,
    cpf: data.cpf,
    address: data.address,
    cep: data.cep,
    zone: data.zone,
    section: data.section,
    voterTitle: data.voterTitle,
    localAtuacao: data.localAtuacao,
  });
}
