import Image from "next/image";

type BrandMarkProps = {
  kind?: "favicon" | "standalone";
  size?: number;
  priority?: boolean;
  className?: string;
};

type BrandLockupProps = {
  kind?: "favicon" | "standalone";
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
};

const lockupSizes = {
  lg: {
    copyClassName: "brand-lockup-copy--lg",
    iconSize: 54
  },
  md: {
    copyClassName: "brand-lockup-copy--md",
    iconSize: 42
  },
  sm: {
    copyClassName: "brand-lockup-copy--sm",
    iconSize: 34
  }
} as const;

export function BrandMark({
  kind = "favicon",
  size = 48,
  priority = false,
  className
}: BrandMarkProps) {
  const src = kind === "standalone" ? "/brand/logo-standalone.png" : "/brand/favicon.png";

  return (
    <span
      className={`brand-mark brand-mark--${kind}${className ? ` ${className}` : ""}`}
      style={{ height: size, width: size }}
    >
      <Image
        alt="Xcellerate logo"
        className="brand-mark-image"
        height={size}
        priority={priority}
        sizes={`${size}px`}
        src={src}
        width={size}
      />
    </span>
  );
}

export function BrandLockup({
  kind = "favicon",
  size = "md",
  priority = false,
  className
}: BrandLockupProps) {
  const config = lockupSizes[size];

  return (
    <div className={`brand-lockup${className ? ` ${className}` : ""}`}>
      <BrandMark kind={kind} priority={priority} size={config.iconSize} />
      <div className={`brand-lockup-copy ${config.copyClassName}`}>
        <strong>Xcellerate Projector</strong>
        <span>Consulting operations</span>
      </div>
    </div>
  );
}
