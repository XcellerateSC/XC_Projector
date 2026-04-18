"use client";

import { useState } from "react";

const FULL_TIME_HOURS_PER_WEEK = 40;

type AllocationInputProps = {
  defaultHours?: number;
  hoursLabel: string;
  inputName: string;
};

function formatHours(hours: number) {
  return hours % 1 === 0 ? `${hours.toFixed(1)}h` : `${hours.toFixed(2)}h`;
}

function formatPercent(hours: number) {
  return ((hours / FULL_TIME_HOURS_PER_WEEK) * 100).toFixed(0);
}

export function AllocationInput({
  defaultHours = 16,
  hoursLabel,
  inputName
}: AllocationInputProps) {
  const [hours, setHours] = useState(defaultHours);

  return (
    <>
      <label className="field">
        <span>{hoursLabel}</span>
        <input
          defaultValue={defaultHours}
          min="0"
          name={inputName}
          onChange={(event) => setHours(Number(event.target.value) || 0)}
          required
          step="0.25"
          type="number"
        />
      </label>

      <div className="field">
        <span>Allocation % / week</span>
        <div className="field-value">
          {formatPercent(hours)}% from {formatHours(hours)}
        </div>
        <small className="field-hint">Calculated automatically from 40h = 100%.</small>
      </div>
    </>
  );
}
