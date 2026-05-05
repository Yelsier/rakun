"use client";
import { useManagerMutation } from "@/client/react";
import { UpdatePasswordInput, updatePasswordInput } from "@rakun-kit/core/contracts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export const UpdatePassword = () => {
  const [open, setOpen] = useState(false);
  type UpdatePasswordFormValues = UpdatePasswordInput & {
    confirmNewPassword: string;
  };

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(
      updatePasswordInput
        .and(
          z.object({
            confirmNewPassword: updatePasswordInput.shape.newPassword,
          }),
        )
        .refine((data) => data.newPassword === data.confirmNewPassword, {
          message: "Passwords do not match",
          path: ["confirmNewPassword"],
        }),
    ),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const { mutate, isPending } = useManagerMutation(
    "manager.auth.updatePassword",
  );

  function onSubmit(values: UpdatePasswordFormValues) {
    mutate(values, {
      onSuccess() {
        form.reset();
        setOpen(false);
        toast.success("Password updated successfully");
      },
      onError(error) {
        toast.error(`Error updating password: ${error.message}`);
      },
    });
  }

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Update Password</Button>
      </DialogTrigger>
      <DialogContent aria-describedby="Edit password">
        <DialogHeader>
          <DialogTitle>Edit Password</DialogTitle>
        </DialogHeader>
        <DialogDescription>Edit password</DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder="Current Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder="New Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder="Confirm New Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" loading={isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
