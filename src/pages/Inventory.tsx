import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogTab } from '@/components/inventory/CatalogTab';
import { StockTab } from '@/components/inventory/StockTab';
import { Package, BoxesIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function InventoryHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stock';

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="space-y-4">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <BoxesIcon className="h-4 w-4" />
            Catalog
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4 border-none p-0 outline-none">
          <StockTab />
        </TabsContent>
        <TabsContent value="catalog" className="mt-4 border-none p-0 outline-none">
          <CatalogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
