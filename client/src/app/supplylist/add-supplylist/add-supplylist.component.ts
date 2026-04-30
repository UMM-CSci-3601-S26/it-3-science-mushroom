import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { map, startWith } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { SupplyListService } from '../supplylist.service';
import { TermsService } from '../../terms/terms.service';
import { Terms } from '../../terms/terms';
import { GRADES } from '../supplylist';
import { SettingsService } from '../../settings/settings.service';

@Component({
  selector: 'app-add-supplylist',
  templateUrl: './add-supplylist.component.html',
  styleUrls: ['./add-supplylist.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule,
    RouterLink,
    CommonModule
  ]
})
export class AddSupplyListComponent implements OnInit {
  private supplyListService = inject(SupplyListService);
  private termsService = inject(TermsService);
  private settingsService = inject(SettingsService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Schools loaded from settings for the dropdown
  availableSchools$ = this.settingsService.getSettings().pipe(
    map(settings => settings.schools.map(s => s.name))
  );

  // Grades list shared with add-family
  readonly grades = GRADES;

  // All terms loaded from the server
  private terms: Terms = { item: [], brand: [], color: [], size: [], type: [], material: [] };

  // Maps well-known brand names (lowercase) → item keywords to try when no item is detected.
  // Keywords are checked against this.terms.item using the same plural-aware matching.
  private readonly brandItemHints: Record<string, string[]> = {
    // Tissues
    'puffs': ['tissue', 'facial tissue'],
    'kleenex': ['tissue', 'facial tissue'],
    // Disinfecting
    'clorox': ['disinfectant wipe', 'wipe', 'disinfecting wipe'],
    'lysol': ['disinfectant wipe', 'wipe', 'disinfecting wipe', 'spray'],
    // Art / drawing
    'crayola': ['crayon', 'marker', 'colored pencil', 'paint', 'watercolor'],
    'fiskars': ['scissors'],
    'sharpie': ['marker', 'permanent marker'],
    'expo': ['marker', 'dry erase marker', 'dry erase'],
    // Adhesives / office
    'elmer': ['glue', 'glue stick'],
    'scotch': ['tape', 'scissors'],
    'avery': ['label', 'binder', 'divider'],
    'post-it': ['sticky note', 'note', 'flag'],
    // Writing
    'ticonderoga': ['pencil'],
    'dixon': ['pencil'],
    'papermate': ['pencil', 'pen', 'eraser'],
    'bic': ['pen', 'pencil', 'eraser'],
    'pentel': ['pen', 'pencil', 'marker'],
    'pilot': ['pen', 'marker'],
    // Paper
    'hammermill': ['paper', 'copy paper'],
    'astrobrights': ['paper', 'cardstock'],
    // Storage / organization
    'mead': ['notebook', 'folder', 'binder', 'composition book'],
    'five star': ['notebook', 'folder', 'binder'],
    'oxford': ['index card', 'notebook'],
    // Hygiene
    'purell': ['hand sanitizer', 'sanitizer'],
    'germ-x': ['hand sanitizer', 'sanitizer'],
    'dial': ['soap', 'hand soap'],
  };

  // Natural language description input
  descriptionInput = '';

  // Controls whether the preview card is visible
  showPreview = false;

  // Filtered suggestion lists for each autocomplete field
  filteredItem$!: Observable<string[]>;
  filteredBrand$!: Observable<string[]>;
  filteredColor$!: Observable<string[]>;
  filteredSize$!: Observable<string[]>;
  filteredType$!: Observable<string[]>;
  filteredMaterial$!: Observable<string[]>;

  addSupplyListForm = new FormGroup({
    school: new FormControl('', Validators.required),
    grade: new FormControl('', Validators.required),
    item: new FormControl('', Validators.required),
    brand: new FormControl(''),
    color: new FormControl(''),
    packageSize: new FormControl('', Validators.min(1)),
    size: new FormControl(''),
    type: new FormControl(''),
    material: new FormControl(''),
    quantity: new FormControl('', [Validators.required, Validators.min(1)]),
    notes: new FormControl('')
  });

  readonly validationMessages = {
    school: [{ type: 'required', message: 'School is required' }],
    grade: [{ type: 'required', message: 'Grade is required' }],
    item: [{ type: 'required', message: 'Item is required' }],
    brand: [{ type: 'required', message: 'Brand is required' }],
    color: [{ type: 'required', message: 'Color is required' }],
    packageSize: [
      { type: 'required', message: 'Count is required' },
      { type: 'min', message: 'Count must be at least 1' }
    ],
    size: [{ type: 'required', message: 'Size is required' }],
    type: [{ type: 'required', message: 'Type is required' }],
    material: [{ type: 'required', message: 'Material is required' }],
    quantity: [
      { type: 'required', message: 'Quantity is required' },
      { type: 'min', message: 'Quantity must be at least 1' }
    ],
    notes: []
  };

  ngOnInit() {
    // Pre-populate school and grade from query params (when navigating from the supply list view)
    const school = this.route.snapshot.queryParamMap.get('school');
    const grade = this.route.snapshot.queryParamMap.get('grade');
    if (school) this.addSupplyListForm.patchValue({ school });
    if (grade) this.addSupplyListForm.patchValue({ grade });

    // Load terms from the server and wire up filtered observables
    this.termsService.getTerms().subscribe({
      next: (terms) => {
        this.terms = terms;
        this.filteredItem$ = this.filterFor('item', terms.item);
        this.filteredBrand$ = this.filterFor('brand', terms.brand);
        this.filteredColor$ = this.filterFor('color', terms.color);
        this.filteredSize$ = this.filterFor('size', terms.size);
        this.filteredType$ = this.filterFor('type', terms.type);
        this.filteredMaterial$ = this.filterFor('material', terms.material);
      },
      error: () => {
        // Terms are optional — autocomplete just won't suggest anything
        this.filteredItem$ = of([]);
        this.filteredBrand$ = of([]);
        this.filteredColor$ = of([]);
        this.filteredSize$ = of([]);
        this.filteredType$ = of([]);
        this.filteredMaterial$ = of([]);
      }
    });
  }

  /** Returns an observable of suggestions filtered to the current field value. */
  private filterFor(controlName: string, allTerms: string[]): Observable<string[]> {
    return this.addSupplyListForm.get(controlName)!.valueChanges.pipe(
      startWith(''),
      map(value => {
        const lower = (value ?? '').toLowerCase();
        // Show suggestions for the last comma-separated token being typed
        const lastToken = lower.split(',').pop()?.trim() ?? '';
        if (!lastToken) {
          return allTerms.slice(0, 50);
        }
        return allTerms.filter(t => t.toLowerCase().includes(lastToken)).slice(0, 50);
      })
    );
  }

  formControlHasError(controlName: string): boolean {
    const control = this.addSupplyListForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof typeof this.validationMessages): string {
    const messages = this.validationMessages[controlName];
    for (const { type, message } of messages) {
      if (this.addSupplyListForm.get(controlName)?.hasError(type)) {
        return message;
      }
    }
    return 'Unknown error';
  }

  /**
   * Parses a natural language description (e.g. "1 box of 24 count Crayola crayons") and
   * pre-fills any form fields it can confidently identify. Unrecognised fields are left
   * as-is so the user can fill them manually. After parsing the preview card appears.
   */
  parseDescription(input: string): void {
    if (!input.trim()) {
      return;
    }
    const lower = input.toLowerCase();
    const patch: Record<string, string> = {};

    // Detect whether the input uses "or" to join options (→ anyOf) vs
    // "and" / commas (→ allOf). This drives how multi-value fields are stored.
    const hasOr = /\bor\b/.test(lower);
    // Separator written into the form field value — toAttr() reads this.
    const sep = hasOr ? ' | ' : ', ';

    // ── Quantity ──────────────────────────────────────────────────────────────
    // "2 boxes of ...", "2 packs", or a bare leading number
    const qtyMatch = lower.match(/^(\d+)\s+(?:box(?:es)?|pack(?:s)?|set(?:s)?|bag(?:s)?|roll(?:s)?|ream(?:s)?|sheet(?:s)?|piece(?:s)?|pair(?:s)?)/);
    if (qtyMatch) {
      patch['quantity'] = qtyMatch[1];
    } else {
      const leadingNum = lower.match(/^(\d+)\b/);
      if (leadingNum) {
        patch['quantity'] = leadingNum[1];
      }
    }

    // ── Count ─────────────────────────────────────────────────────────────────
    // "24 count", "24ct", "24-count", "pack of 24", "box of 24"
    const packageSizeMatch = lower.match(/(\d+)\s*[-]?\s*(?:count|ct|pk|pack)\b/)
      || lower.match(/(?:pack|box|set)\s+of\s+(\d+)/);
    if (packageSizeMatch) {
      patch['packageSize'] = packageSizeMatch[1];
    }

    // ── Brand ─────────────────────────────────────────────────────────────────
    // Detect brand first so we can use it as a hint for item inference below.
    const matchedBrand = this.bestTermMatch(lower, this.terms.brand);
    if (matchedBrand) {
      patch['brand'] = matchedBrand;
    }

    // ── Item ──────────────────────────────────────────────────────────────────
    // Longest matching term wins (avoids "pen" matching "pencil").
    // If no item found directly, use the brand→item hint map as a fallback.
    let matchedItem = this.bestTermMatch(lower, this.terms.item);
    if (!matchedItem && matchedBrand) {
      const hints = this.brandItemHints[matchedBrand.toLowerCase()] ?? [];
      matchedItem = this.bestTermMatch(hints.join(' '), this.terms.item)
        ?? (hints.length ? hints[0] : null);
    }
    if (matchedItem) {
      patch['item'] = matchedItem;
    }

    // ── Color ─────────────────────────────────────────────────────────────────
    // Collect ALL color terms; join with sep so 'or' routes to anyOf in toAttr.
    const matchedColors = this.allTermMatches(lower, this.terms.color);
    if (matchedColors.length) {
      patch['color'] = matchedColors.join(sep);
    }

    // ── Size ──────────────────────────────────────────────────────────────────
    // Size is entered as a simple text field in the form and converted to
    // AttributeOptions during submit.
    const sizeTermMatches = this.allTermMatches(lower, this.terms.size);
    const fallbackSize = ['large', 'medium', 'small', 'xl', 'xxl', 'xs'].find(s => lower.includes(s)) ?? null;
    if (sizeTermMatches.length) {
      patch['size'] = sizeTermMatches.join(sep);
    } else if (fallbackSize) {
      patch['size'] = fallbackSize;
    }

    // ── Default container size for new system (Option B: "Box of 24") ─────────────
    // If quantity > 1 and no size was detected from the new DB terms,
    // infer a container type. If a count exists, include it.
    if (!patch['size'] && patch['quantity']) {
      const qty = Number(patch['quantity']);
      if (qty > 1) {
        const packageSize = patch['packageSize'] ? ` of ${patch['packageSize']}` : '';
        patch['size'] = `Box${packageSize}`;   // e.g., "Box of 24", "Box"
      }
    }

    // ── Type ─────────────
    const matchedTypes = this.allTermMatches(lower, this.terms.type);
    if (matchedTypes.length) {
      patch['type'] = matchedTypes.join(sep);
    }

    // ── Material ─────────────────────────────────────────────────────────────
    const matchedMaterials = this.allTermMatches(lower, this.terms.material);
    if (matchedMaterials.length) {
      patch['material'] = matchedMaterials.join(sep);
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    // Anything in parentheses is a note — UNLESS it looks like a count/quantity
    // or matches a known term (color, size, etc.), in which case it was already
    // handled above and should not be duplicated into notes.
    // e.g. "(24 ct.)" → count, skip;  "(for art class)" → notes
    const structuredParenPattern = /^\d+\s*(?:count|ct\.?|pk\.?|pack\.?|oz\.?|lb\.?|ml\.?|g\.?|mm\.?|cm\.?|in\.?|ft\.?)?\s*$/i;
    const allTermWords = [
      ...this.terms.item, ...this.terms.brand, ...this.terms.color,
      ...this.terms.size, ...this.terms.type, ...this.terms.material
    ];
    const noteFragments = [...input.matchAll(/\(([^)]+)\)/g)]
      .map(m => m[1].trim())
      .filter(fragment => {
        if (!fragment) {
          return false;
        }
        if (structuredParenPattern.test(fragment)) {
          return false; // looks like "24 ct." — already parsed as count
        }
        if (this.bestTermMatch(fragment.toLowerCase(), allTermWords)) {
          return false; // matches a known term — already captured in a field
        }
        return true;
      });
    if (noteFragments.length) {
      const existing = (this.addSupplyListForm.get('notes')?.value ?? '').trim();
      patch['notes'] = [existing, ...noteFragments].filter(Boolean).join('; ');
    }

    this.addSupplyListForm.patchValue(patch);
    this.showPreview = true;

    console.log("Brand match:", this.bestTermMatch(lower, this.terms.brand));
    console.log("Item match:", this.bestTermMatch(lower, this.terms.item));
    console.log("Loaded terms:", this.terms);
  }

  /** Returns the longest term from the list that appears as a whole word in the input, or null.
   *  Also matches common plural/singular variants so e.g. "crayons" matches term "crayon". */
  private bestTermMatch(lower: string, terms: string[]): string | null {
    let best: string | null = null;
    for (const term of terms) {
      const t = term.toLowerCase();
      const candidates = this.pluralForms(t);
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matched = candidates.some(c => new RegExp(`(?:^|\\s)${esc(c)}(?:$|\\s)`).test(lower));
      if (matched && (!best || t.length > best.length)) {
        best = term; // keep original casing from terms list
      }
    }
    return best;
  }

  /** Returns ALL terms from the list that appear as whole words in the input.
   *  Used for multi-value fields like color where several may apply at once. */
  private allTermMatches(lower: string, terms: string[]): string[] {
    const results: string[] = [];
    const seen = new Set<string>();
    for (const term of terms) {
      const t = term.toLowerCase();
      const candidates = this.pluralForms(t);
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matched = candidates.some(c => new RegExp(`(?:^|\\s)${esc(c)}(?:$|\\s)`).test(lower));
      if (matched && !seen.has(t)) {
        seen.add(t);
        results.push(term);
      }
    }
    return results;
  }

  /** Generates plausible plural and singular variants of a term. */
  private pluralForms(t: string): string[] {
    const forms = new Set<string>([t]);
    // Add plural
    if (t.endsWith('y') && t.length > 2 && !/[aeiou]y$/.test(t)) {
      forms.add(t.slice(0, -1) + 'ies');     // candy → candies
    } else if (/(?:ch|sh|x|z|s)$/.test(t)) {
      forms.add(t + 'es');                    // brush → brushes
    } else if (!t.endsWith('s')) {
      forms.add(t + 's');                     // crayon → crayons
    }
    // Add singular (strip common plural suffixes)
    if (t.endsWith('ies') && t.length > 4) {
      forms.add(t.slice(0, -3) + 'y');       // candies → candy
    } else if (t.endsWith('es') && t.length > 3) {
      forms.add(t.slice(0, -2));             // brushes → brush
      forms.add(t.slice(0, -1));             // –es edge case
    } else if (t.endsWith('s') && t.length > 2) {
      forms.add(t.slice(0, -1));             // crayons → crayon
    }
    return [...forms];
  }

  /** Returns the parsed form values in a shape ready for display in the preview. */
  get previewValues() {
    return this.addSupplyListForm.value;
  }

  clearForm(): void {
    this.addSupplyListForm.reset();
    this.descriptionInput = '';
    this.showPreview = false;
  }

  submitForm() {
    const raw = this.addSupplyListForm.value;
    // For AttributeOptions fields, '|' means anyOf; otherwise value is stored in allOf.
    const toAttr = (val: string | null | undefined): import('../supplylist').AttributeOptions => {
      if (!val || !val.trim()) {
        return { allOf: '', anyOf: [] };
      }
      if (val.includes('|')) {
        return { allOf: '', anyOf: val.split('|').map(s => s.trim()).filter(Boolean) };
      }
      return { allOf: val.split(',').map(s => s.trim()).filter(Boolean).join(', '), anyOf: [] };
    };

    // Color keeps allOf/anyOf as string arrays.
    const toColorAttr = (val: string | null | undefined): import('../supplylist').ColorAttributeOptions => {
      if (!val || !val.trim()) {
        return { allOf: [], anyOf: [] };
      }
      if (val.includes('|')) {
        return { allOf: [], anyOf: val.split('|').map(s => s.trim()).filter(Boolean) };
      }
      return { allOf: val.split(',').map(s => s.trim()).filter(Boolean), anyOf: [] };
    };

    const formData: Partial<import('../supplylist').SupplyList> = {
      school: raw.school ?? undefined,
      grade: raw.grade ?? undefined,
      item: raw.item ? raw.item.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      brand: toAttr(raw.brand),
      color: toColorAttr(raw.color),
      size: toAttr(raw.size),
      type: toAttr(raw.type),
      material: toAttr(raw.material),
      notes: raw.notes ?? undefined,
      packageSize: raw.packageSize ? parseInt(raw.packageSize, 10) : 1,
      quantity: raw.quantity ? parseInt(raw.quantity, 10) : 1
    };

    this.supplyListService.addSupplyList(formData).subscribe({
      next: () => {
        this.snackBar.open('Added supply list item', undefined, { duration: 2000 });
        this.router.navigate(['/supplylist']);
      },
      error: (err) => {
        this.snackBar.open(
          `Failed to add item – Error Code: ${err.status}\nMessage: ${err.message}`,
          'OK',
          { duration: 6000 }
        );
      }
    });
  }
}
