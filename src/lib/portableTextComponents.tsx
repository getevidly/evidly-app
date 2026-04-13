import { urlFor } from './sanityClient';

export const portableTextComponents = {
  types: {
    image: ({ value }: any) => (
      <figure className="my-8">
        <img
          src={urlFor(value).width(800).auto('format').url()}
          alt={value.alt || ''}
          className="rounded-lg w-full"
          loading="lazy"
        />
        {value.caption && (
          <figcaption className="text-sm text-[#1E2D4D]/50 mt-2 text-center">
            {value.caption}
          </figcaption>
        )}
      </figure>
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#1E2D4D] underline hover:text-[#2A3F6B]"
      >
        {children}
      </a>
    ),
    code: ({ children }: any) => (
      <code className="bg-[#1E2D4D]/5 text-[#1E2D4D]/70 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
  },
  block: {
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-bold tracking-tight mt-10 mb-4" style={{ color: '#1E2D4D' }}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#1E2D4D' }}>
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-lg font-semibold tracking-tight mt-6 mb-2" style={{ color: '#1E2D4D' }}>
        {children}
      </h4>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-[#A08C5A] pl-4 my-6 italic text-[#1E2D4D]/70">
        {children}
      </blockquote>
    ),
    normal: ({ children }: any) => (
      <p className="text-[#1E2D4D]/80 leading-relaxed mb-4">{children}</p>
    ),
  },
  list: {
    bullet: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-4 space-y-1 text-[#1E2D4D]/80">{children}</ul>
    ),
    number: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1 text-[#1E2D4D]/80">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  },
};
