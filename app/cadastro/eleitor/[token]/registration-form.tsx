"use client";

import { useState, useCallback } from "react";
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
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitVoterRegistrationAction } from "./actions";

const voterFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  phone: z
    .string()
    .regex(/^\d{11}$/, "Telefone deve conter 11 dígitos"),
  zone: z
    .string()
    .regex(/^\d{1,4}$/, "Zona deve conter apenas dígitos (1-4 caracteres)"),
  section: z
    .string()
    .regex(/^\d{1,4}$/, "Seção deve conter apenas dígitos (1-4 caracteres)"),
  voterTitle: z
    .string()
    .min(12, "Título de eleitor deve ter 12 dígitos")
    .max(12)
    .regex(/^\d{12}$/, "Título deve conter 12 dígitos")
    .optional()
    .or(z.literal("")),
  cep: z.string().optional(),
});

type VoterFormValues = z.infer<typeof voterFormSchema>;

interface VoterRegistrationFormProps {
  token: string;
}

export function VoterRegistrationForm({ token }: VoterRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<VoterFormValues>({
    resolver: zodResolver(voterFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      zone: "",
      section: "",
      voterTitle: "",
      cep: "",
    },
  });

  const handleCepBlur = useCallback(
    async (cepValue: string) => {
      const cleanCep = cepValue.replace(/\D/g, "");
      if (cleanCep.length !== 8) return;

      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cleanCep}/json/`
        );
        const data = await response.json();

        if (!data.erro) {
          form.setValue("cep", `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
        }
      } catch {
        // Silently fail for CEP lookup
      }
    },
    [form]
  );

  async function onSubmit(values: VoterFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitVoterRegistrationAction({
        token,
        name: values.name,
        phone: values.phone,
        zone: values.zone,
        section: values.section,
        voterTitle: values.voterTitle || undefined,
        cep: values.cep || undefined,
      });

      if (result.ok) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitSuccess) {
    return (
      <div className="text-center space-y-4">
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Cadastro realizado com sucesso!
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Seus dados foram registrados. Obrigado!
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone (com DDD)</FormLabel>
              <FormControl>
                <Input placeholder="00000000000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="zone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona</FormLabel>
                <FormControl>
                  <Input placeholder="000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seção</FormLabel>
                <FormControl>
                  <Input placeholder="000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="voterTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de eleitor (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="000000000000" maxLength={12} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="00000000"
                  maxLength={8}
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleCepBlur(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cadastrando...
            </>
          ) : (
            "Cadastrar"
          )}
        </Button>
      </form>
    </Form>
  );
}
