type SettingsRowProps = {
  label: string
  description?: string
  htmlFor?: string
  control: React.ReactNode
}

export function SettingsRow({ label, description, htmlFor, control }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-5">
      <div className="flex min-w-0 flex-col gap-1">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

type SettingsSectionProps = {
  title: string
  hint?: string
  children: React.ReactNode
}

export function SettingsSection({ title, hint, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/55">
          {title}
        </h2>
        {hint ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}
