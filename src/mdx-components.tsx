import type { MDXComponents } from "mdx/types";

// Prose styling for MDX write-ups. Required by @next/mdx in the App Router.
const components: MDXComponents = {
  h3: (props) => (
    <h3 className="mt-14 mb-4 font-display text-xl font-medium text-text first:mt-0 md:text-2xl" {...props} />
  ),
  p: (props) => <p className="mb-5 leading-relaxed text-muted" {...props} />,
  em: (props) => <em className="text-text not-italic underline decoration-line underline-offset-4" {...props} />,
  strong: (props) => <strong className="font-medium text-text" {...props} />,
  a: (props) => (
    <a className="text-text underline decoration-line underline-offset-4 hover:decoration-accent" {...props} />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
