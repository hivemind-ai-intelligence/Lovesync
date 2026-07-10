import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          if (res.success && res.token) {
            setToken(res.token);
            setLocation("/");
          } else {
            toast({
              title: "Login failed",
              description: "Invalid credentials",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Something went wrong. Are you sure you belong here?",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      </div>
      
      <div className="z-10 w-full max-w-md p-8 glass-card rounded-2xl mx-4 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-light text-foreground mb-2 tracking-tight">
            OURROOM
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            A private space to listen together.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-widest">Username</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="bg-black/20 border-white/10 text-white focus:border-primary/50 transition-colors h-12" 
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-widest">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      className="bg-black/20 border-white/10 text-white focus:border-primary/50 transition-colors h-12" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full h-12 mt-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-primary/50 transition-all font-light tracking-wide text-md"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "ENTER"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
