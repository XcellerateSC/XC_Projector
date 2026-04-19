export type SkillRequirementLevel = "required" | "preferred";

export type SkillOption = {
  categoryName: string | null;
  id: string;
  name: string;
};

export function formatSkillOptionLabel(skill: SkillOption) {
  return skill.categoryName ? `${skill.categoryName} / ${skill.name}` : skill.name;
}

export function formatRequirementLevel(level: SkillRequirementLevel) {
  return level === "required" ? "Required" : "Preferred";
}

export function getRequirementWeight(level: SkillRequirementLevel) {
  return level === "required" ? 100 : 50;
}

export function formatProficiencyLabel(score: number | null | undefined) {
  switch (score) {
    case 1:
      return "Awareness";
    case 2:
      return "Working";
    case 3:
      return "Independent";
    case 4:
      return "Advanced";
    case 5:
      return "Expert";
    default:
      return "Unrated";
  }
}
