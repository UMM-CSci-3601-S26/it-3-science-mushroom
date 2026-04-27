import { TestBed } from '@angular/core/testing';
import { BarcodePrintWindowService } from './barcode-print-window.service';
import { PrintableBarcodeItem } from './barcode-print-item';
import { Inventory } from './inventory';

describe('BarcodePrintWindowService', () => {
  let service: BarcodePrintWindowService;

  const item: Inventory = {
    internalID: 'item-a',
    internalBarcode: 'ITEM-00001',
    item: 'Markers <Blue>',
    brand: 'Crayola',
    description: 'Washable & bright "markers"',
    color: 'Blue',
    size: 'Wide',
    type: 'Washable',
    material: 'Plastic',
    quantity: 5,
    maxQuantity: 10,
    minQuantity: 1,
    stockState: 'stocked',
    notes: 'A',
  };

  const printableItem: PrintableBarcodeItem = {
    item,
    barcode: 'ITEM-00001',
    barcodeImage: 'data:image/png;base64,barcode-image',
    quantity: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BarcodePrintWindowService],
    });

    service = TestBed.inject(BarcodePrintWindowService);
  });

  it('returns false when the browser blocks the popup window', () => {
    spyOn(window, 'open').and.returnValue(null);

    expect(service.open([printableItem])).toBeFalse();
  });

  it('opens a popup window and writes printable barcode HTML', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus'),
    } as unknown as Window;

    spyOn(window, 'open').and.returnValue(popupWindow);

    const opened = service.open([printableItem]);

    expect(opened).toBeTrue();
    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=900,height=700');
    expect(documentSpy.open).toHaveBeenCalled();
    expect(documentSpy.close).toHaveBeenCalled();
    expect(popupWindow.focus).toHaveBeenCalled();

    const html = documentSpy.write.calls.mostRecent().args[0] as string;
    expect(html).toContain('Print Barcodes');
    expect(html).toContain('data:image/png;base64,barcode-image');
    expect(html).toContain('Markers &lt;Blue&gt;');
    expect(html).toContain('Washable &amp; bright &quot;markers&quot;');
    expect(html.match(/data:image\/png;base64,barcode-image/g)?.length).toBe(2);
  });
});
