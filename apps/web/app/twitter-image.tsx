// Same card for Twitter/X; Next wires this file into twitter:image.
//
// The segment config has to be declared here, literally — Next reads these
// fields statically and refuses a re-export. Everything else is the same
// image.
export { default, alt, size, contentType } from './opengraph-image';

export const runtime = 'nodejs';
export const revalidate = 3600;
