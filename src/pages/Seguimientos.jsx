import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import "../styles/seguimientos.css";

const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toNumber = (value) => {
  const normalized = String(value ?? "")
    .replace(",", ".")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPercent = (value) => {
  const number = toNumber(value);
  if (number === null) return "No disponible";
  return `${number}%`;
};

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const buildYearKeys = (metas, avances) => {
  const keys = new Set();
  [...metas, ...avances].forEach((item) => {
    Object.keys(item || {}).forEach((key) => {
      const match = key.match(/^(meta|avance)_(\d{4})$/);
      if (match) keys.add(match[2]);
    });
  });
  return [...keys].sort((a, b) => Number(a) - Number(b));
};

const Seguimientos = ({ data, userInfo }) => {
  const sessionUser = useMemo(() => {
    if (userInfo) return userInfo;
    try {
      const stored = sessionStorage.getItem("loggedUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [userInfo]);

  const userDependencyId = String(sessionUser?.id_dependencia || "").trim();
  const isSystemUser =
    userDependencyId === "0" || normalize(sessionUser?.permiso) === "sistemas";

  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );

  const indicators = useMemo(
    () => sortById(getSheet(data, "INDICADORES_PRODUCTO")),
    [data],
  );
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);

  const desafioById = useMemo(
    () => new Map(desafios.map((item) => [String(item.id), item])),
    [desafios],
  );
  const dependenciaById = useMemo(
    () => new Map(dependencias.map((item) => [String(item.id), item])),
    [dependencias],
  );
  const metaByIndicatorId = useMemo(
    () =>
      new Map(metas.map((item) => [String(item.id_indicador_producto), item])),
    [metas],
  );
  const avanceByIndicatorId = useMemo(
    () => new Map(avances.map((item) => [String(item.id_indicador), item])),
    [avances],
  );

  const availableYears = useMemo(
    () => buildYearKeys(metas, avances),
    [metas, avances],
  );

  const [selectedDependency, setSelectedDependency] = useState("");

  function limpiarPorcentaje(dato) {
    // Si es un string, quita el símbolo % y los espacios vacíos
    if (typeof dato === "string") {
      dato = dato.replace("%", "").trim();
    }
    // Convierte a número flotante (ej: "15.5" pasa a 15.5)
    return parseFloat(dato);
  }

  const contadorIndicadores = (avancesValue) => {
    const porcentaje = limpiarPorcentaje(avancesValue);
    let bajo = 0;
    let medio = 0;
    let alto = 0;
    let superior = 0;
    if (porcentaje >= 90) {
      superior++;
    }
    if (porcentaje >= 50 && porcentaje < 89) {
      alto++;
    }
    if (porcentaje >= 30 && porcentaje < 49) {
      medio++;
    }
    if (porcentaje >= 0 && porcentaje < 29) {
      bajo++;
    }
    console.log({ bajo, medio, alto, superior });
    return { bajo, medio, alto, superior };
  };

  function calcularCumplimientoTotal(arregloMetas) {
    // 1. Validar que el arreglo no esté vacío para evitar división por cero
    if (!arregloMetas || arregloMetas.length === 0) return "0%";

    // 2. Sumar los porcentajes procesados
    const sumaPorcentajes = arregloMetas.reduce((acumulado, meta) => {
      // Si viene como string (ej: "57,6%"), cambiamos la coma por punto y quitamos el %
      let valorLimpio = String(meta).replace("%", "").replace(",", ".").trim();

      // Convertimos a número decimal
      let numero = parseFloat(valorLimpio);

      // Si el dato no es válido, sumamos 0
      return acumulado + (isNaN(numero) ? 0 : numero);
    }, 0);

    // 3. Calcular el promedio (Suma total / Cantidad de metas)
    const promedio = sumaPorcentajes / arregloMetas.length;

    // 4. Retornar el resultado formateado (con un decimal y el símbolo %)
    return `${promedio.toFixed(1).replace(".", ",")}%`;
  }

  const currentYear = String(new Date().getFullYear());
  const initialYear = availableYears.includes(currentYear)
    ? currentYear
    : availableYears[0] || currentYear;
  const [selectedYear, setSelectedYear] = useState(initialYear);

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(
        availableYears.includes(currentYear) ? currentYear : availableYears[0],
      );
    }
  }, [availableYears, selectedYear, currentYear]);

  const rowsByDesafio = useMemo(() => {
    const grouped = new Map();

    indicators.forEach((indicator) => {
      if (
        selectedDependency &&
        String(indicator.id_dependencia ?? "") !== selectedDependency
      ) {
        return;
      }

      const challengeId = String(indicator.id_desafio ?? "");
      const desafio = desafioById.get(challengeId);
      if (!desafio) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;
      if (metaValue == null && avanceValue == null) return;

      const existing = grouped.get(challengeId) || {
        desafio,
        indicators: [],
      };

      existing.indicators.push({
        ...indicator,
        metaValue,
        avanceValue,
      });
      grouped.set(challengeId, existing);
    });

    return [...grouped.values()].filter((group) => group.indicators.length > 0);
  }, [
    indicators,
    desafioById,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
    selectedDependency,
  ]);

  const dependencyOptions = useMemo(() => {
    const counts = new Map();

    indicators.forEach((indicator) => {
      const dependencyId = String(indicator.id_dependencia ?? "");
      if (!dependencyId) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;
      if (metaValue == null && avanceValue == null) return;

      counts.set(dependencyId, (counts.get(dependencyId) || 0) + 1);
    });

    return dependencias.filter((item) => counts.has(String(item.id)));
  }, [
    dependencias,
    indicators,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
  ]);

  const totales = rowsByDesafio.reduce(
    (acumulador, group) => {
      group.indicators.forEach((indicator) => {
        const conteo = contadorIndicadores(indicator.avanceValue);

        // Sumamos el valor actual al acumulador (aseguramos que sea número)
        acumulador.superior += conteo.superior || 0;
        acumulador.alto += conteo.alto || 0;
        acumulador.medio += conteo.medio || 0;
        acumulador.bajo += conteo.bajo || 0;
      });
      return acumulador;
    },
    { superior: 0, alto: 0, medio: 0, bajo: 0 }, // Valores iniciales en 0
  );

  const totals = useMemo(() => {
    let totalIndicadores = 0;
    const executed = rowsByDesafio.reduce((sum, group) => {
      return (
        sum +
        group.indicators.reduce((inner, indicator) => {
          let valorLimpio = String(indicator.avanceValue)
            .replace("%", "")
            .replace(",", ".")
            .trim();
          let numero = parseFloat(valorLimpio);
          totalIndicadores++;
          return inner + (numero ?? 0);
        }, 0)
      );
    }, 0);
    const promedio = executed / totalIndicadores;
    return {
      promedio,
      pending: Math.max(0, 100 - promedio),
    };
  }, [rowsByDesafio]);

  const challengeCounts = useMemo(
    () =>
      rowsByDesafio.map((group) => ({
        desafio: group.desafio,
        count: group.indicators.length,
      })),
    [rowsByDesafio],
  );

  if (!data) {
    return (
      <Paper className="seguimientos-empty" elevation={0}>
        <Typography>Cargando información...</Typography>
      </Paper>
    );
  }

  return (
    <Box className="seguimientos-page">
      <Paper className="seguimientos-panel" elevation={1}>
        <Box className="seguimientos-header">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Seguimientos
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {rowsByDesafio.reduce(
                (sum, group) => sum + group.indicators.length,
                0,
              )}{" "}
              indicadores con seguimiento
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {(availableYears.length ? availableYears : [currentYear]).map(
                (year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Dependencia</InputLabel>
            <Select
              value={selectedDependency}
              label="Dependencia"
              onChange={(event) => setSelectedDependency(event.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {dependencyOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Box className="seguimientos-layout">
        <TableContainer component={Paper} className="seguimientos-table-card">
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Desafio</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Nombre Indicador</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta planeada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta ejecutada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Porcentaje Real</TableCell>
              </TableRow>
              {rowsByDesafio.map((group) =>
                group.indicators.map((indicator, index) => (
                  <TableRow key={`${group.desafio.id}-${indicator.id}`}>
                    {index === 0 && (
                      <TableCell
                        rowSpan={group.indicators.length}
                        sx={{ fontWeight: 700 }}
                      >
                        {toText(group.desafio.titulo)}
                      </TableCell>
                    )}
                    <TableCell>{toText(indicator.nombre)}</TableCell>
                    <TableCell>{formatPercent(indicator.metaValue)}</TableCell>
                    <TableCell>{indicator.avanceValue}</TableCell>
                    {limpiarPorcentaje(indicator.avanceValue) >= 90 ? (
                      <TableCell sx={{ backgroundColor: "lightgreen" }}>
                        {indicator.avanceValue}
                      </TableCell>
                    ) : limpiarPorcentaje(indicator.avanceValue) >= 50 &&
                      limpiarPorcentaje(indicator.avanceValue) < 90 ? (
                      <TableCell sx={{ backgroundColor: "lightblue" }}>
                        {indicator.avanceValue}
                      </TableCell>
                    ) : limpiarPorcentaje(indicator.avanceValue) >= 30 &&
                      limpiarPorcentaje(indicator.avanceValue) < 50 ? (
                      <TableCell sx={{ backgroundColor: "yellow" }}>
                        {indicator.avanceValue}
                      </TableCell>
                    ) : limpiarPorcentaje(indicator.avanceValue) >= 0 &&
                      limpiarPorcentaje(indicator.avanceValue) < 30 ? (
                      <TableCell sx={{ backgroundColor: "salmon" }}>
                        {indicator.avanceValue}
                      </TableCell>
                    ) : (
                      <TableCell>{indicator.avanceValue}</TableCell>
                    )}
                  </TableRow>
                )),
              )}
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                  Total porcentaje ejecutado
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}></TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {`${totals.promedio.toFixed(1).replace(".", ",")}%`}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                  Pendiente por ejecutar
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}></TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {`${totals.pending.toFixed(1).replace(".", ",")}%`}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Paper className="seguimientos-summary" elevation={1}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Resumen
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Concepto</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Cantidad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Total indicadores</TableCell>
                  <TableCell>
                    {rowsByDesafio.reduce(
                      (sum, group) => sum + group.indicators.length,
                      0,
                    )}
                  </TableCell>
                </TableRow>
                {challengeCounts.map((item) => (
                  <TableRow key={item.desafio.id}>
                    <TableCell>{toText(item.desafio.titulo)}</TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box className="seguimientos-chart">
            <PieChart
              series={[
                {
                  data: [
                    {
                      id: 0,
                      value: totals.promedio,
                      label: "Ejecutado",
                      color: "green",
                    },
                    {
                      id: 1,
                      value: totals.pending,
                      label: "Pendiente",
                      color: "red",
                    },
                  ],
                },
              ]}
              width={250}
              height={250}
              slotProps={{
                legend: {
                  padding: -10, // Aumenta este número para alejar los labels del círculo
                },
              }}
            ></PieChart>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Contador de indicadores y significado de colores
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {/* FILA 1: SUPERIOR */}
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      Mayores de 90%
                    </TableCell>

                    <TableCell sx={{ backgroundColor: "lightgreen" }}>
                      {totales.superior}
                    </TableCell>
                  </TableRow>

                  {/* FILA 2: ALTO */}
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Entre 50% y 89%
                    </TableCell>

                    <TableCell sx={{ backgroundColor: "lightblue" }}>
                      {totales.alto}
                    </TableCell>
                  </TableRow>

                  {/* FILA 3: MEDIO */}
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Entre 30% y 49%
                    </TableCell>

                    <TableCell sx={{ backgroundColor: "yellow" }}>
                      {totales.medio}
                    </TableCell>
                  </TableRow>

                  {/* FILA 4: BAJO */}
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Entre 0% y 29%
                    </TableCell>

                    <TableCell sx={{ backgroundColor: "salmon" }}>
                      {totales.bajo}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      </Box>

      {!rowsByDesafio.length && (
        <Paper className="seguimientos-empty" elevation={0}>
          <Typography>
            No se encontraron indicadores con seguimiento para el año
            seleccionado.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Seguimientos;
