"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { submitVoterRegistrationAction } from "./actions";

const voterFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  motherName: z.string().min(2, "Nome da mãe deve ter pelo menos 2 caracteres").max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato aaaa-mm-dd"),
  zone: z.string().regex(/^\d{1,4}$/, "Zona deve conter apenas dígitos (1-4 caracteres)"),
  section: z.string().regex(/^\d{1,4}$/, "Seção deve conter apenas dígitos (1-4 caracteres)"),
  phone: z.string().min(10, "Telefone inválido").max(11),
  voterTitle: z.string().min(12, "Título de eleitor deve ter 12 dígitos").max(12).regex(/^\d{12}$/, "Título deve conter 12 dígitos"),
  honeypot: z.string().optional(),
});

type VoterFormValues = z.infer<typeof voterFormSchema>;

interface VoterRegistrationFormProps {
  campaignSlug: string;
  publicCode: string;
}

export function VoterRegistrationForm({ campaignSlug, publicCode }: VoterRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<VoterFormValues>({
    resolver: zodResolver(voterFormSchema),
    defaultValues: {
      name: "",
      motherName: "",
      birthDate: "",
      zone: "",
      section: "",
      phone: "",
      voterTitle: "",
      honeypot: "",
    },
  });

  async function onSubmit(data: VoterFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitVoterRegistrationAction(campaignSlug, publicCode, data);

      if (result.ok) {
        setSubmitSuccess(true);
        form.reset();
      } else {
        if (result.code === "DUPLICATE_PHONE") {
          form.setError("phone", { message: result.message });
        } else if (result.code === "RATE_LIMITED") {
          setSubmitError(result.message);
        } else if (result.code === "NOT_FOUND" || result.code === "CAMPAIGN_CLOSED" || result.code === "LINK_INACTIVE") {
          setSubmitError(result.message);
        } else if (result.code === "VALIDATION_ERROR" && result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            form.setError(field as keyof VoterFormValues, { message: messages[0] });
          });
        } else {
          setSubmitError(result.message || "Erro ao processar cadastro");
        }
      }
    } catch {
      setSubmitError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitSuccess) {
    return (
      <div role="status" aria-live="polite" aria-atomic="true">
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Cadastro realizado com sucesso! Entraremos em contato em breve.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <input
          type="text"
          {...form.register("honeypot")}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        <div aria-live="polite" aria-atomic="true">
          {submitError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription id="submit-error-message">{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="name">Nome Completo</FormLabel>
              <FormControl>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  aria-describedby="name-error"
                  aria-invalid={!!form.formState.errors.name}
                  {...field}
                />
              </FormControl>
              <FormMessage id="name-error" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="motherName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="motherName">Nome da Mãe</FormLabel>
              <FormControl>
                <Input
                  id="motherName"
                  placeholder="Nome completo da mãe"
                  aria-describedby="motherName-error"
                  aria-invalid={!!form.formState.errors.motherName}
                  {...field}
                />
              </FormControl>
              <FormMessage id="motherName-error" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="birthDate">Data de Nascimento</FormLabel>
              <FormControl>
                <Input
                  id="birthDate"
                  type="date"
                  aria-describedby="birthDate-error"
                  aria-invalid={!!form.formState.errors.birthDate}
                  {...field}
                />
              </FormControl>
              <FormMessage id="birthDate-error" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="zone"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="zone">Zona</FormLabel>
                <FormControl>
                  <Input
                    id="zone"
                    placeholder="123"
                    aria-describedby="zone-error"
                    aria-invalid={!!form.formState.errors.zone}
                    {...field}
                  />
                </FormControl>
                <FormMessage id="zone-error" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="section">Seção</FormLabel>
                <FormControl>
                  <Input
                    id="section"
                    placeholder="456"
                    aria-describedby="section-error"
                    aria-invalid={!!form.formState.errors.section}
                    {...field}
                  />
                </FormControl>
                <FormMessage id="section-error" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="phone">Telefone</FormLabel>
              <FormControl>
                <Input
                  id="phone"
                  placeholder="11999999999"
                  type="tel"
                  aria-describedby="phone-error"
                  aria-invalid={!!form.formState.errors.phone}
                  {...field}
                />
              </FormControl>
              <FormMessage id="phone-error" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="voterTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="voterTitle">Título de Eleitor</FormLabel>
              <FormControl>
                <Input
                  id="voterTitle"
                  placeholder="123456789012"
                  aria-describedby="voterTitle-error"
                  aria-invalid={!!form.formState.errors.voterTitle}
                  {...field}
                />
              </FormControl>
              <FormMessage id="voterTitle-error" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full min-h-[44px]"
          disabled={isSubmitting}
          aria-describedby="submit-error-message"
        >
          {isSubmitting ? "Enviando..." : "Cadastrar"}
        </Button>
      </form>
    </Form>
  );
}
