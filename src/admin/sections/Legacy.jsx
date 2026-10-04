import { PageHeader } from "../ui";

/** Wraps an existing admin component with the new page header + restyle scope. */
export default function Legacy({ eyebrow, title, description, children }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="legacy min-w-0">{children}</div>
    </>
  );
}
