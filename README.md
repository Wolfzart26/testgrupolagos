
#  LiquiVerde – Backend + Frontend (Docker)


* **Frontend:** React + Vite + Tailwind
* **Backend:** Node.js (Express) + PostgreSQL
* **db:** Postgresql (Contiene archivo init.sql con una tabla de productos y valores con los que inicializar.)
* **Funciones principales:**

  * Catálogo con búsqueda y categorías
  * Carrito persistente en `localStorage`
  * Sugerencias por **ahorro / ambiente / balanceado**
  * Optimización de compras según **presupuesto**








---

## Instrucciones de ejecucion

1 **Clona** este repositorio en tu máquina:

```bash
git clone https://github.com/Wolfzart26/testgrupolagos
cd testgrupolagos
```

2 **Levanta todo con Docker Compose:**

```bash
docker compose up --build
```

*  **Frontend:** [http://localhost:5173](http://localhost:5173)
*  **Backend API:** [http://localhost:3000/api](http://localhost:3000/api)


3 **Para detener:**

```bash
docker compose down
```
---
## Explicacion de algoritmos
**Scoring de sostenibilidad:** se calcula normalizando los valores entre 0 y 1 de precio, co2, y social(cantidad de productos comprados), de cada uno de los productos. luego cada una de estas variables es multiplicado por un peso, los cuales son fijos. cada variable se multiplica por un peso, el resultado de cada uno representa el scoring de sostenivilidad economico, ambiental y social.

Se encuentra en la carpeta  sustainability.js


**Algoritmo de mochila:** En Este caso se suman los valores de scoring de sostenibilidad  obteniendo un valor cercano al 1. Este valor indica que tan cercano esta el producto de ser elegible para poder comprar en base a presupuesto. por lo cual, de una lista selecciona los productos que cumplan con el mejor precio, con ser el mas popular, y ser el que menos contamine. para luego ir quitando o manteniendo los productos de la lista realizada por el usuario.

##Uso de IA
En este trabajo se utilizo IA para poder comprender los algoritmos mencionandos en el test. Tambien se utiilizo para el desarrollo del codigo.
