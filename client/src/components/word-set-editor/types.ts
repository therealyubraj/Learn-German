export type EditableQuizItem = {
  id: string;
  LHS: string;
  RHS: string;
  remarks: string;
  remarksEN: string;
  TTS: string;
};

export type ItemFormValues = Omit<EditableQuizItem, "id">;

export type AddMode = "single" | "json";
