import { z } from 'zod/mini';

import { IDService } from '@application/services/IDService';
import { validateSchemaInDomain } from '@application/utils/validateSchemaInDomain';

import { Entity } from './core/Entity';

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Color palette (Tailwind 600 / 50) ───────────────────────────────────────

const COLOR_PALETTE = [
  { color: '#DC2626', bgColor: '#FEF2F2' }, // red
  { color: '#EA580C', bgColor: '#FFF7ED' }, // orange
  { color: '#D97706', bgColor: '#FFFBEB' }, // amber
  { color: '#16A34A', bgColor: '#F0FDF4' }, // green
  { color: '#0D9488', bgColor: '#F0FDFA' }, // teal
  { color: '#2563EB', bgColor: '#EFF6FF' }, // blue
  { color: '#4F46E5', bgColor: '#EEF2FF' }, // indigo
  { color: '#7C3AED', bgColor: '#F5F3FF' }, // violet
  { color: '#9333EA', bgColor: '#FAF5FF' }, // purple
  { color: '#DB2777', bgColor: '#FDF2F8' }, // pink
] as const;

function randomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

// ─────────────────────────────────────────────────────────────────────────────

const attrsSchema = z.object({
  accountId: IDService.idSchema,
  name: z.string().check(z.minLength(2), z.maxLength(128)),
  slug: z.string().check(z.minLength(1)),
  color: z.string().check(z.regex(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/)),
  bgColor: z.string().check(z.regex(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/)),
});

export class Category extends Entity {
  readonly accountId: string;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
  readonly bgColor: string;

  constructor(id: string, attrs: Category.CreateParams) {
    super(id);

    const validated = validateSchemaInDomain(attrsSchema, {
      ...attrs,
      slug: attrs.slug ?? slugify(attrs.name),
    });

    this.accountId = validated.accountId;
    this.name = validated.name;
    this.slug = validated.slug;
    this.color = validated.color;
    this.bgColor = validated.bgColor;
  }

  static create(attrs: Category.CreateParams) {
    const { color, bgColor } =
      attrs.color !== undefined && attrs.bgColor !== undefined
        ? { color: attrs.color, bgColor: attrs.bgColor }
        : randomColor();

    return new Category(IDService.generate(), { ...attrs, color, bgColor });
  }
}

export namespace Category {
  export type CreateParams = Omit<z.input<typeof attrsSchema>, 'color' | 'bgColor' | 'slug'> & {
    color?: string;
    bgColor?: string;
    slug?: string;
  };

  export type Attributes = z.output<typeof attrsSchema>;
}
