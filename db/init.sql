-- =========================================================
-- init.sql - Base de datos completa para "liquiverde"
-- =========================================================
DROP TABLE IF EXISTS public.products;

CREATE TABLE public.products (
  id             TEXT PRIMARY KEY,
  barcode        TEXT UNIQUE,
  name           TEXT NOT NULL,
  brand          TEXT,
  category       TEXT,
  unit           TEXT,
  pack_size      NUMERIC(12,3),
  price          INTEGER,
  co2_kg         NUMERIC(10,3),
  health_score   INTEGER,
  social_score   INTEGER,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  search_vector  tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(name,'') || ' ' || coalesce(brand,''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_products_fts ON public.products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_products_category_norm ON public.products (LOWER(TRIM(category)));
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);

-- =========================================================
-- DATOS
-- =========================================================
INSERT INTO public.products (id, barcode, name, brand, category, unit, pack_size, price, co2_kg, health_score, social_score, description) VALUES
-- 🥣 CEREALES
('p1', '000111', 'Avena integral 500g', 'Granero', 'cereales', 'pack', 500, 1800, 0.45, 82, 60, 'Avena integral para desayuno.'),
('p1b','000124', 'Avena con miel 500g', 'Granero', 'cereales', 'pack', 500, 1900, 0.48, 80, 61, 'Avena endulzada con miel.'),
('p1c','000125', 'Cereal de maíz 400g', 'CerealMix', 'cereales', 'pack', 400, 2100, 0.60, 75, 55, 'Cereal crujiente de maíz.'),
('p1d','000126', 'Granola frutos secos 500g', 'NaturalLife', 'cereales', 'pack', 500, 3200, 0.70, 88, 68, 'Granola con almendras y miel.'),
('p1e','000127', 'Cereal de avena y cacao 450g', 'HealthyDay', 'cereales', 'pack', 450, 2500, 0.65, 84, 63, 'Cereal de avena con cacao natural.'),

-- 🥛 LACTEOS
('p2', '000112', 'Leche descremada 1L', 'Láctea', 'lacteos', 'litro', 1, 1200, 1.10, 70, 55, 'Leche descremada UHT.'),
('p2b','000119', 'Leche semi descremada 1L', 'Láctea', 'lacteos', 'litro', 1, 1100, 0.95, 72, 58, 'Leche semidescremada.'),
('p2c','000120', 'Leche vegetal avena 1L', 'Veggie', 'lacteos', 'litro', 1, 1500, 0.55, 78, 68, 'Bebida vegetal de avena.'),
('p2d','000128', 'Yogurt natural 900g', 'BioLac', 'lacteos', 'pack', 900, 2000, 0.80, 85, 66, 'Yogurt natural sin azúcar.'),
('p2e','000129', 'Queso fresco 250g', 'Campo', 'lacteos', 'pack', 250, 2200, 1.80, 72, 60, 'Queso fresco artesanal.'),
('p2f','000130', 'Leche entera 1L', 'Láctea', 'lacteos', 'litro', 1, 1300, 1.25, 68, 54, 'Leche entera pasteurizada.'),

-- 🥬 VERDURAS
('p8','000118','Tomate 1kg','Huerta','verduras','kg',1,1400,0.25,92,65,'Tomate fresco por kilo.'),
('p8b','000123','Tomate orgánico 1kg','Huerta','verduras','kg',1,1600,0.18,94,72,'Tomate orgánico certificado.'),
('p8c','000131','Lechuga escarola 1ud','Huerta','verduras','unidad',1,900,0.10,95,70,'Lechuga fresca.'),
('p8d','000132','Zanahoria 1kg','Huerta','verduras','kg',1,1100,0.22,93,66,'Zanahoria fresca.'),
('p8e','000133','Brócoli 1kg','Huerta','verduras','kg',1,1700,0.20,97,74,'Brócoli orgánico.'),
('p8f','000134','Espinaca 500g','CampoVerde','verduras','pack',500,1200,0.19,96,73,'Espinaca fresca.'),

-- 🍎 FRUTAS
('p3','000113','Manzanas 1kg','Huerta','frutas','kg',1,1500,0.30,90,65,'Manzana fresca por kilo.'),
('p3b','000135','Peras 1kg','Huerta','frutas','kg',1,1400,0.28,91,66,'Peras jugosas.'),
('p3c','000136','Plátanos 1kg','Tropical','frutas','kg',1,1300,0.35,88,64,'Plátano maduro.'),
('p3d','000137','Naranjas 1kg','Huerta','frutas','kg',1,1200,0.29,90,63,'Naranjas dulces.'),
('p3e','000138','Uvas 500g','Campo','frutas','pack',500,1600,0.27,87,62,'Uvas frescas.'),
('p3f','000139','Kiwi 1kg','AndesFruit','frutas','kg',1,1700,0.31,92,67,'Kiwi nacional.'),

-- 🍗 PROTEINAS
('p4','000114','Pechuga de pollo 1kg','Campo','proteinas','kg',1,4800,6.00,75,50,'Pechuga fresca.'),
('p4b','000140','Filete de pollo 1kg','Campo','proteinas','kg',1,4900,5.80,77,52,'Filete natural.'),
('p4c','000141','Carne molida 1kg','CarnesSur','proteinas','kg',1,6500,8.20,70,48,'Carne molida magra.'),
('p4d','000142','Carne posta rosada 1kg','CarnesSur','proteinas','kg',1,7200,8.00,68,45,'Posta rosada.'),
('p4e','000143','Pescado merluza 1kg','MarSur','proteinas','kg',1,5600,4.20,82,55,'Filete de merluza.'),
('p4f','000144','Huevos 12un','GranjaAndes','proteinas','unidad',12,3200,2.10,80,60,'Huevos de gallinas libres.'),

-- 🫘 LEGUMBRES
('p5','000115','Lentejas 1kg','Andes','legumbres','kg',1,2300,0.90,88,70,'Lentejas secas.'),
('p5b','000121','Lentejas premium 1kg','Andes','legumbres','kg',1,2400,0.85,90,72,'Lentejas seleccionadas.'),
('p5c','000145','Porotos granados 1kg','Andes','legumbres','kg',1,2600,0.95,87,68,'Porotos frescos.'),
('p5d','000146','Garbanzos 1kg','Granero','legumbres','kg',1,2700,0.88,89,69,'Garbanzos secos.'),
('p5e','000147','Arvejas 1kg','Andes','legumbres','kg',1,2200,0.82,91,71,'Arvejas verdes.'),
('p5f','000148','Mix legumbres 1kg','HealthyDay','legumbres','kg',1,2500,0.92,90,70,'Mezcla de legumbres.'),

-- 🍞 PANADERIA
('p7','000117','Pan integral 600g','Horno','panaderia','pack',600,1600,0.80,78,58,'Pan integral tajado.'),
('p7b','000122','Pan integral 550g','Horno','panaderia','pack',550,1500,0.75,80,60,'Pan integral 550g.'),
('p7c','000149','Pan blanco 500g','Horno','panaderia','pack',500,1300,0.90,60,55,'Pan blanco clásico.'),
('p7d','000150','Pan sin gluten 400g','FreeLife','panaderia','pack',400,2500,0.70,85,70,'Pan apto celíacos.'),
('p7e','000151','Tostadas integrales 250g','CerealMix','panaderia','pack',250,1800,0.65,82,65,'Tostadas crujientes.'),

-- 🍶 DESPENSA Y OTROS
('p6','000116','Aceite de maravilla 1L','Sol','despensa','litro',1,2500,2.00,40,55,'Aceite vegetal refinado.'),
('p6b','000152','Aceite de oliva 500ml','Campo','despensa','litro',0.5,4500,1.80,85,70,'Aceite de oliva extra virgen.'),
('p6c','000153','Vinagre blanco 1L','Sol','despensa','litro',1,1900,0.60,80,60,'Vinagre blanco.'),
('p6d','000154','Arroz blanco 1kg','Granero','despensa','kg',1,1800,1.00,65,58,'Arroz blanco grano largo.'),
('p6e','000155','Arroz integral 1kg','Granero','despensa','kg',1,2000,0.90,85,65,'Arroz integral.'),
('p6f','000156','Azúcar rubia 1kg','DulceSur','despensa','kg',1,2100,1.20,55,50,'Azúcar menos refinada.'),

-- 🧂 CONDIMENTOS
('p9','000157','Sal marina 1kg','Andes','condimentos','kg',1,1200,0.10,80,60,'Sal marina natural.'),
('p9b','000158','Pimienta negra 50g','Sabor','condimentos','pack',50,1000,0.15,78,62,'Pimienta negra molida.'),
('p9c','000159','Comino 50g','Sabor','condimentos','pack',50,900,0.14,80,63,'Comino molido.'),
('p9d','000160','Orégano 20g','CampoVerde','condimentos','pack',20,700,0.09,82,65,'Orégano seco.'),
('p9e','000161','Ajo en polvo 40g','Sabor','condimentos','pack',40,1100,0.12,83,66,'Ajo en polvo.'),
('p9f','000162','Paprika 50g','Sabor','condimentos','pack',50,1200,0.13,85,68,'Paprika molida.');

-- =========================================================
-- CONSULTAS DE CHEQUEO
-- =========================================================
-- SELECT COUNT(*) FROM public.products;
-- SELECT category, COUNT(*) FROM public.products GROUP BY category ORDER BY category;
-- SELECT * FROM public.products LIMIT 10;
