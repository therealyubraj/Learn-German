import { QuizItem } from "../../types";
import { EditableQuizItem, ItemFormValues } from "./types";

export function toEditableItem(item: QuizItem): EditableQuizItem {
  return {
    id: crypto.randomUUID(),
    LHS: item.LHS,
    RHS: item.RHS,
    remarks: item.remarks ?? "",
    remarksEN: item.remarksEN ?? "",
    TTS: item.TTS ?? "",
  };
}

export function getEmptyFormValues(): ItemFormValues {
  return {
    LHS: "",
    RHS: "",
    remarks: "",
    remarksEN: "",
    TTS: "",
  };
}

export function getItemFormValues(item: EditableQuizItem): ItemFormValues {
  return {
    LHS: item.LHS,
    RHS: item.RHS,
    remarks: item.remarks,
    remarksEN: item.remarksEN,
    TTS: item.TTS,
  };
}

export function normalizeQuizItem(
  item: ItemFormValues,
  index: number,
): QuizItem {
  const LHS = item.LHS.trim();
  const RHS = item.RHS.trim();
  const remarks = item.remarks.trim();
  const remarksEN = item.remarksEN.trim();
  const TTS = item.TTS.trim();

  if (LHS === "") {
    throw new Error(`LHS is empty at item ${index + 1}.`);
  }

  if (RHS === "") {
    throw new Error(`RHS is empty at item ${index + 1}.`);
  }

  return {
    LHS,
    RHS,
    remarks: remarks || undefined,
    remarksEN: remarksEN || undefined,
    TTS: TTS || undefined,
  };
}

export function parseQuizItemsFromJSON(jsonInput: string): ItemFormValues[] {
  let parsedJSON: unknown;

  try {
    parsedJSON = JSON.parse(jsonInput);
  } catch {
    throw new Error("The JSON input is not valid.");
  }

  if (!Array.isArray(parsedJSON)) {
    throw new Error("The JSON input must be an array.");
  }

  if (parsedJSON.length === 0) {
    throw new Error("The JSON input is empty.");
  }

  return parsedJSON.map((item, index) => {
    const candidate = item as Partial<QuizItem>;

    if (typeof candidate.LHS !== "string" || candidate.LHS.trim() === "") {
      throw new Error(`LHS is empty at imported item ${index + 1}.`);
    }

    if (typeof candidate.RHS !== "string" || candidate.RHS.trim() === "") {
      throw new Error(`RHS is empty at imported item ${index + 1}.`);
    }

    if (
      candidate.remarks !== undefined &&
      candidate.remarks !== null &&
      typeof candidate.remarks !== "string"
    ) {
      throw new Error(`remarks must be a string at imported item ${index + 1}.`);
    }

    if (
      candidate.remarksEN !== undefined &&
      candidate.remarksEN !== null &&
      typeof candidate.remarksEN !== "string"
    ) {
      throw new Error(
        `remarksEN must be a string at imported item ${index + 1}.`,
      );
    }

    if (
      candidate.TTS !== undefined &&
      candidate.TTS !== null &&
      typeof candidate.TTS !== "string"
    ) {
      throw new Error(`TTS must be a string at imported item ${index + 1}.`);
    }

    return {
      LHS: candidate.LHS.trim(),
      RHS: candidate.RHS.trim(),
      remarks: candidate.remarks?.trim() ?? "",
      remarksEN: candidate.remarksEN?.trim() ?? "",
      TTS: candidate.TTS?.trim() ?? "",
    };
  });
}
