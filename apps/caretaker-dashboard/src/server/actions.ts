"use server";

import { revalidatePath } from "next/cache";

import type {
  AlertUpdate,
  MyWorldItemCreate,
  MyWorldItemUpdate,
  PatientCreate,
  ReminderCreate,
  ReminderUpdate,
  UploadResourceType,
} from "@coco/shared-types";

import {
  createMyWorldItem,
  createPatient,
  createReminder,
  deleteMyWorldItem,
  deleteReminder,
  getUploadSignature,
  updateAlert,
  updateMyWorldItem,
  updateReminder,
} from "@/server/caregiver-api";
import { ApiError } from "@/server/server-api";

function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    throw new Error(err.message);
  }
  throw err instanceof Error ? err : new Error("Something went wrong");
}

export async function createPatientAction(payload: PatientCreate) {
  try {
    const patient = await createPatient(payload);
    revalidatePath("/");
    revalidatePath("/patients");
    return patient;
  } catch (err) {
    rethrow(err);
  }
}

export async function createReminderAction(payload: ReminderCreate) {
  try {
    const reminder = await createReminder(payload);
    revalidatePath(`/patients/${payload.patient_id}`);
    revalidatePath("/alerts");
    revalidatePath("/");
    return reminder;
  } catch (err) {
    rethrow(err);
  }
}

export async function updateReminderAction(
  id: string,
  patientId: string,
  payload: ReminderUpdate
) {
  try {
    const reminder = await updateReminder(id, payload);
    revalidatePath(`/patients/${patientId}`);
    revalidatePath("/alerts");
    revalidatePath("/");
    return reminder;
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteReminderAction(id: string, patientId: string) {
  try {
    await deleteReminder(id);
    revalidatePath(`/patients/${patientId}`);
    revalidatePath("/alerts");
    revalidatePath("/");
  } catch (err) {
    rethrow(err);
  }
}

export async function updateAlertAction(id: string, payload: AlertUpdate) {
  try {
    const alert = await updateAlert(id, payload);
    revalidatePath("/alerts");
    revalidatePath("/");
    if (alert.patient_id) {
      revalidatePath(`/patients/${alert.patient_id}`);
    }
    return alert;
  } catch (err) {
    rethrow(err);
  }
}

export async function createMemoryAction(
  patientId: string,
  payload: MyWorldItemCreate
) {
  try {
    const item = await createMyWorldItem(patientId, payload);
    revalidatePath(`/patients/${patientId}`);
    return item;
  } catch (err) {
    rethrow(err);
  }
}

export async function updateMemoryAction(
  patientId: string,
  itemId: string,
  payload: MyWorldItemUpdate
) {
  try {
    const item = await updateMyWorldItem(patientId, itemId, payload);
    revalidatePath(`/patients/${patientId}`);
    return item;
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteMemoryAction(patientId: string, itemId: string) {
  try {
    await deleteMyWorldItem(patientId, itemId);
    revalidatePath(`/patients/${patientId}`);
  } catch (err) {
    rethrow(err);
  }
}

/**
 * Hands the browser a short-lived Cloudinary signature so the file uploads
 * straight to Cloudinary. Returns null when uploads are not configured, so
 * the form can fall back to pasting a media URL.
 */
export async function getUploadSignatureAction(
  patientId: string,
  resourceType: UploadResourceType,
  filename?: string
) {
  try {
    return await getUploadSignature(patientId, resourceType, filename);
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      return null;
    }
    rethrow(err);
  }
}
