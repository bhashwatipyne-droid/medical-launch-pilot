import { PROJECTS } from "@/constants/testIds";
import { fieldBase, fieldLabel } from "@/components/projects/createProjectLogic";

const Req = () => <span className="text-[rgb(239,68,68)]">*</span>;

export function CreateProjectNameFields(ctx) {
  const { name, nameUnderline, setConfirmed, setName } = ctx;
  return (
    <label className={fieldLabel}>
      <span>
        Launch name <Req />
      </span>
      <input
        data-testid={PROJECTS.fieldName}
        aria-label="Launch name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setConfirmed(false);
        }}
        placeholder="e.g. PX-200 Pulse Oximeter Launch"
        className={`${fieldBase} font-normal ${nameUnderline}`}
      />
    </label>
  );
}

export function CreateProjectDescriptionField(ctx) {
  const { description, nameState, setDescription } = ctx;
  return (
    <label className={fieldLabel}>
      <span>What is this launch for?</span>
      <textarea
        aria-label="Launch description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="One line the team will see, e.g. Fingertip pulse oximeter for pharmacies and home care"
        className={`${fieldBase} h-auto resize-y py-2.5 font-normal leading-5`}
      />
      {nameState === "similar" && (
        <span className="text-xs font-normal text-amber-800">
          A similar launch exists. Add what makes this one different, like the model number or variant.
        </span>
      )}
    </label>
  );
}
