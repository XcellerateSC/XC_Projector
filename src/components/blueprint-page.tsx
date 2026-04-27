import type { ReactNode } from "react";

type BlueprintPageProps = {
  children: ReactNode;
  notices?: ReactNode;
  top?: ReactNode;
};

export function BlueprintPage({ children, notices, top }: BlueprintPageProps) {
  return (
    <div className="blueprint-page">
      {notices}

      <div className="blueprint-page-main">
        {top}
        {children}
      </div>
    </div>
  );
}
