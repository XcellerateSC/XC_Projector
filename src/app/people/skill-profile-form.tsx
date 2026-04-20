"use client";

import { useMemo, useState } from "react";

type SkillCategoryOption = {
  id: string;
  name: string;
};

type SkillCatalogOption = {
  categoryId: string;
  categoryName: string | null;
  id: string;
  name: string;
};

type SkillProfileFormProps = {
  categories: SkillCategoryOption[];
  profileId: string;
  skills: SkillCatalogOption[];
};

export function SkillProfileForm({
  categories,
  profileId,
  skills
}: SkillProfileFormProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const filteredSkills = useMemo(
    () =>
      selectedCategoryId
        ? skills.filter((skill) => skill.categoryId === selectedCategoryId)
        : [],
    [selectedCategoryId, skills]
  );

  return (
    <>
      <input name="profile_id" type="hidden" value={profileId} />

      <label className="field">
        <span>Category</span>
        <select
          name="skill_category_id"
          onChange={(event) => setSelectedCategoryId(event.target.value)}
          required
          value={selectedCategoryId}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Skill</span>
        <select disabled={!selectedCategoryId} name="skill_id" required>
          <option value="">{selectedCategoryId ? "Select skill" : "Select category first"}</option>
          {filteredSkills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Proficiency</span>
        <select defaultValue="3" name="proficiency_score" required>
          <option value="1">1 - Awareness</option>
          <option value="2">2 - Working</option>
          <option value="3">3 - Independent</option>
          <option value="4">4 - Advanced</option>
          <option value="5">5 - Expert</option>
        </select>
      </label>

      <label className="field">
        <span>Notes</span>
        <input name="notes" placeholder="Optional context or specialty" type="text" />
      </label>
    </>
  );
}
