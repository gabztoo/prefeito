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
import { submitCoordinatorRegistrationAction } from "./actions";

const coordinatorFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  email: z.string().email("Email inválido"),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres").max(128),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  address: z.string().optional(),
  zone: z.string().regex(/^\d{1,4}$/, "Zona deve conter apenas dígitos (1-4 caracteres)").optional().or(z.literal("")),
  section: z.string().regex(/^\d{1,4}$/, "Seção deve conter apenas dígitos (1-4 caracteres)").optional().or(z.literal("")),
  voterTitle: z.string().min(12, "Título de eleitor deve ter 12 dígitos").max(12).regex(/^\d{12}$/, "Título deve conter 12 dígitos").optional().or(z.literal("")),
});

type CoordinatorFormValues = z.infer<typeof coordinatorFormSchema>;

interface CoordinatorRegistrationFormProps {
  token: string;
}

export function CoordinatorRegistrationForm({ token }: CoordinatorRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CoordinatorFormValues>({
    resolver: zodResolver(coordinatorFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      cpf: "",
      rg: "",
      address: "",
      zone: "",
      section: "",
      voterTitle: "",
    },
  });

  async function onSubmit(data: CoordinatorFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitCoordinatorRegistrationAction(token, {
        name: data.name,
        email: data.email,
        password: data.password,
        cpf: data.cpf || undefined,
        rg: data.rg || undefined,
        address: data.address || undefined,
        zone: data.zone || undefined,
        section: data.section || undefined,
        voterTitle: data.voterTitle || undefined,
      });

      if (result.ok) {
        setSubmitSuccess(true);
        form.reset();
      } else {
        setSubmitError(result.message || "Erro ao processar cadastro");
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
            Cadastro realizado com sucesso! Você já pode fazer login com seu email e senha.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  aria-describedby="email-error"
                  aria-invalid={!!form.formState.errors.email}
                  {...field}
                />
              </FormControl>
              <FormMessage id="email-error" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="password">Senha</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 12 caracteres"
                  aria-describedby="password-error"
                  aria-invalid={!!form.formState.errors.password}
                  {...field}
                />
              </FormControl>
              <FormMessage id="password-error" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rg"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="rg">RG</FormLabel>
                <FormControl>
                  <Input
                    id="rg"
                    placeholder="12.345.678-9"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cpf">CPF</FormLabel>
                <FormControl>
                  <Input
                    id="cpf"
                    placeholder="123.456.789-00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="address">Endereço</FormLabel>
              <FormControl>
                <Input
                  id="address"
                  placeholder="Rua, número, bairro, cidade - UF"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zone"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="zone">Zona</FormLabel>
                <FormControl>
                  <Input
                    id="zone"
                    placeholder="0123"
                    {...field}
                  />
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
                <FormLabel htmlFor="section">Seção</FormLabel>
                <FormControl>
                  <Input
                    id="section"
                    placeholder="0456"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full min-h-[44px]"
          disabled={isSubmitting}
          aria-describedby="submit-error-message"
        >
          {isSubmitting ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </form>
    </Form>
  );
}
