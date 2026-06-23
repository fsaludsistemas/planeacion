import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TextField,
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

const limpiarPorcentaje = (dato) => {
  if (typeof dato === "string") {
    dato = dato.replace("%", "").trim();
  }
  return parseFloat(dato);
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

const getHeaderDate = () =>
  new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getCurrentTime = () =>
  new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const isPrivilegedRole = (role) => {
  const value = normalize(role);
  return value === "administrador" || value === "sistemas" || value === "0";
};

const percentageClass = (value) => {
  const n = limpiarPorcentaje(value);
  if (n >= 90) return "lightgreen";
  if (n >= 50) return "lightblue";
  if (n >= 30) return "yellow";
  if (n >= 0) return "salmon";
  return "transparent";
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

  const userRole = normalize(sessionUser?.rol || sessionUser?.permiso);
  const userDependencyId = String(sessionUser?.id_dependencia || "").trim();
  const canSeeAll = isPrivilegedRole(userRole);

  const [selectedDependency, setSelectedDependency] = useState("");
  const [selectedDesafio, setSelectedDesafio] = useState("");
  const [selectedConvergente, setSelectedConvergente] = useState("");
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [selectedPrograma, setSelectedPrograma] = useState("");
  const [selectedResultado, setSelectedResultado] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [logroFilter, setLogroFilter] = useState("");

  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );
  const users = useMemo(() => sortById(getSheet(data, "USUARIOS")), [data]);
  const indicators = useMemo(
    () => sortById(getSheet(data, "INDICADORES_PRODUCTO")),
    [data],
  );
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);
  const estrategiasConvergentes = useMemo(
    () =>
      sortById(
        getSheet(data, "ESTRATEGIA_CONVERGENTE", "ESTRATEGIA_CONVERGENTE"),
      ),
    [data],
  );
  const estrategiasFacultad = useMemo(
    () => sortById(getSheet(data, "ESTRATEGIA_FACULTAD")),
    [data],
  );
  const programasInstitucionales = useMemo(
    () => sortById(getSheet(data, "PROGRAMAS_INST")),
    [data],
  );
  const indicadoresResultado = useMemo(
    () => sortById(getSheet(data, "INDICADORES_RESULTADO")),
    [data],
  );

  const desafioById = useMemo(
    () => new Map(desafios.map((item) => [String(item.id), item])),
    [desafios],
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

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (!canSeeAll && userDependencyId) {
      setSelectedDependency(userDependencyId);
    }
  }, [canSeeAll, userDependencyId]);

  const filterableIndicators = useMemo(() => {
    return indicators.filter((indicator) => {
      if (!canSeeAll && userDependencyId) {
        if (String(indicator.id_dependencia || "") !== userDependencyId) {
          return false;
        }
      }
      if (
        selectedDependency &&
        String(indicator.id_dependencia || "") !== selectedDependency
      ) {
        return false;
      }
      if (
        selectedDesafio &&
        String(indicator.id_desafio || "") !== selectedDesafio
      ) {
        return false;
      }
      if (
        selectedConvergente &&
        String(indicator.id_estrategia_convergente || "") !==
          selectedConvergente
      ) {
        return false;
      }
      if (
        selectedFacultad &&
        String(indicator.id_estrategia_facultad || "") !== selectedFacultad
      ) {
        return false;
      }
      if (
        selectedPrograma &&
        String(indicator.id_programa_inst || "") !== selectedPrograma
      ) {
        return false;
      }
      if (
        selectedResultado &&
        String(indicator.id_indicador_resultado || "") !== selectedResultado
      ) {
        return false;
      }
      if (
        logroFilter &&
        !normalize(indicator.logro).includes(normalize(logroFilter))
      ) {
        return false;
      }
      return true;
    });
  }, [
    indicators,
    canSeeAll,
    userDependencyId,
    selectedDependency,
    selectedDesafio,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
    logroFilter,
  ]);

  const rowsByDesafio = useMemo(() => {
    const grouped = new Map();
    filterableIndicators.forEach((indicator) => {
      const desafio = desafioById.get(String(indicator.id_desafio || ""));
      if (!desafio) return;
      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;
      if (metaValue == null && avanceValue == null) return;
      const existing = grouped.get(String(desafio.id)) || {
        desafio,
        indicators: [],
      };
      existing.indicators.push({
        ...indicator,
        metaValue,
        avanceValue,
      });
      grouped.set(String(desafio.id), existing);
    });
    return [...grouped.values()];
  }, [
    filterableIndicators,
    desafioById,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
  ]);

  const dependencyOptions = useMemo(() => {
    const ids = new Set(
      filterableIndicators.map((item) => String(item.id_dependencia || "")),
    );
    return dependencias.filter((item) => ids.has(String(item.id)));
  }, [dependencias, filterableIndicators]);

  const convergenteOptions = useMemo(() => {
    const ids = selectedDesafio
      ? [selectedDesafio]
      : [
          ...new Set(
            filterableIndicators.map((item) => String(item.id_desafio || "")),
          ).values(),
        ];
    return estrategiasConvergentes.filter((item) =>
      ids.includes(String(item.id_desafio || "")),
    );
  }, [estrategiasConvergentes, filterableIndicators, selectedDesafio]);

  const facultadOptions = useMemo(() => {
    const ids = selectedConvergente
      ? [selectedConvergente]
      : [
          ...new Set(
            filterableIndicators.map((item) =>
              String(item.id_estrategia_convergente || ""),
            ),
          ).values(),
        ];
    return estrategiasFacultad.filter((item) =>
      ids.includes(
        String(item.id_estrategia_convergente || item.id_convergente || ""),
      ),
    );
  }, [estrategiasFacultad, filterableIndicators, selectedConvergente]);

  const programaOptions = useMemo(() => {
    const ids = selectedFacultad
      ? [selectedFacultad]
      : [
          ...new Set(
            filterableIndicators.map((item) =>
              String(item.id_estrategia_facultad || ""),
            ),
          ).values(),
        ];
    return programasInstitucionales.filter((item) =>
      ids.includes(String(item.id_estrategia_facultad || "")),
    );
  }, [programasInstitucionales, filterableIndicators, selectedFacultad]);

  const resultadoOptions = useMemo(() => {
    const ids = selectedPrograma
      ? [selectedPrograma]
      : [
          ...new Set(
            filterableIndicators.map((item) =>
              String(item.id_programa_inst || ""),
            ),
          ).values(),
        ];
    return indicadoresResultado.filter((item) =>
      ids.includes(String(item.id_programa_inst || "")),
    );
  }, [indicadoresResultado, filterableIndicators, selectedPrograma]);

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

  const indicatorColorCounts = useMemo(() => {
    return filterableIndicators.reduce(
      (acc, indicator) => {
        const value = limpiarPorcentaje(
          avanceByIndicatorId.get(String(indicator.id))?.[
            `avance_${selectedYear}`
          ],
        );
        if (value >= 90) acc.superior += 1;
        else if (value >= 50) acc.alto += 1;
        else if (value >= 30) acc.medio += 1;
        else if (value >= 0) acc.bajo += 1;
        return acc;
      },
      { superior: 0, alto: 0, medio: 0, bajo: 0 },
    );
  }, [filterableIndicators, avanceByIndicatorId, selectedYear]);

  const exportToPdf = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    const headerDate = getHeaderDate();
    const currentTime = getCurrentTime();
    const filtersText = [
      `Año: ${selectedYear}`,
      `Dependencia: ${selectedDependency || "Todas"}`,
      `Desafío: ${selectedDesafio || "Todos"}`,
      `Estrategia convergente: ${selectedConvergente || "Todas"}`,
      `Estrategia facultad: ${selectedFacultad || "Todas"}`,
      `Programa institucional: ${selectedPrograma || "Todos"}`,
      `Indicador resultado: ${selectedResultado || "Todos"}`,
      `Logro: ${logroFilter || "Todos"}`,
    ];

    printWindow.document.write(`
      <html>
        <head>
          <title>Seguimientos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
            h1, h2, p { margin: 0 0 8px; }
            .meta { margin-bottom: 16px; font-size: 12px; color: #444; }
            .filters { margin-bottom: 16px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #ccc; padding: 6px; font-size: 11px; }
            th { background: #f1f1f1; }
            .c-green { background: lightgreen; }
            .c-blue { background: lightblue; }
            .c-yellow { background: yellow; }
            .c-salmon { background: salmon; }
          </style>
        </head>
        <body>
          <h1>Seguimientos</h1>
          <div class="meta">Última actualización: ${headerDate} | Hora de exportación: ${currentTime}</div>
          <div class="filters">
            <strong>Filtros activos</strong><br/>
            ${filtersText.map((item) => `${item}<br/>`).join("")}
          </div>
          ${rowsByDesafio
            .map(
              (group) => `
                <h2>${toText(group.desafio.titulo)}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Meta</th>
                      <th>Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${group.indicators
                      .map((indicator) => {
                        const bg = percentageClass(indicator.avanceValue);
                        const cls =
                          bg === "lightgreen"
                            ? "c-green"
                            : bg === "lightblue"
                              ? "c-blue"
                              : bg === "yellow"
                                ? "c-yellow"
                                : bg === "salmon"
                                  ? "c-salmon"
                                  : "";
                        return `
                          <tr>
                            <td>${toText(indicator.nombre)}</td>
                            <td>${formatPercent(indicator.metaValue)}</td>
                            <td class="${cls}">${toText(indicator.avanceValue)}</td>
                          </tr>
                        `;
                      })
                      .join("")}
                  </tbody>
                </table>
              `,
            )
            .join("")}
          <script>
            window.onload = function () { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
        <Box className="seguimientos-header" sx={{ flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Seguimientos
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {filterableIndicators.length} indicadores con seguimiento
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {(availableYears.length
                ? availableYears
                : [String(new Date().getFullYear())]
              ).map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Dependencia</InputLabel>
            <Select
              value={selectedDependency}
              label="Dependencia"
              onChange={(e) => setSelectedDependency(e.target.value)}
              disabled={!canSeeAll}
            >
              <MenuItem value="">Todas</MenuItem>
              {dependencyOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={() => setAdvancedFiltersOpen(true)}
          >
            Ver más filtros
          </Button>
          <Button variant="contained" onClick={exportToPdf}>
            Exportar a pdf
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={advancedFiltersOpen}
        onClose={() => setAdvancedFiltersOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Más filtros</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <FormControl size="small" fullWidth>
              <InputLabel>Desafío</InputLabel>
              <Select
                value={selectedDesafio}
                label="Desafío"
                onChange={(e) => setSelectedDesafio(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {desafios.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.titulo)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Estrategia convergente</InputLabel>
              <Select
                value={selectedConvergente}
                label="Estrategia convergente"
                onChange={(e) => setSelectedConvergente(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {convergenteOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.titulo)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Estrategia facultad</InputLabel>
              <Select
                value={selectedFacultad}
                label="Estrategia facultad"
                onChange={(e) => setSelectedFacultad(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {facultadOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.titulo)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Programa institucional</InputLabel>
              <Select
                value={selectedPrograma}
                label="Programa institucional"
                onChange={(e) => setSelectedPrograma(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {programaOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.titulo)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Indicador resultado</InputLabel>
              <Select
                value={selectedResultado}
                label="Indicador resultado"
                onChange={(e) => setSelectedResultado(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {resultadoOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.nombre)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Logro"
              value={logroFilter}
              onChange={(e) => setLogroFilter(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvancedFiltersOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Box className="seguimientos-layout">
        <TableContainer component={Paper} className="seguimientos-table-card">
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Desafío</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Nombre Indicador</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta planeada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta ejecutada</TableCell>
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
                    <TableCell
                      sx={{
                        backgroundColor: percentageClass(indicator.avanceValue),
                      }}
                    >
                      {indicator.avanceValue}
                    </TableCell>
                  </TableRow>
                )),
              )}
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                  Total porcentaje ejecutado
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {`${totals.promedio.toFixed(1).replace(".", ",")}%`}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                  Pendiente por ejecutar
                </TableCell>
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
                  <TableCell>{filterableIndicators.length}</TableCell>
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
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Contador de indicadores y significado de colores
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Mayores de 90%
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "lightgreen" }}>
                      {indicatorColorCounts.superior}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Entre 50% y 89%
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "lightblue" }}>
                      {indicatorColorCounts.alto}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Entre 30% y 49%
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "yellow" }}>
                      {indicatorColorCounts.medio}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}
                    >
                      Entre 0% y 29%
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "salmon" }}>
                      {indicatorColorCounts.bajo}
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
            No se encontraron indicadores con seguimiento para los filtros
            seleccionados.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Seguimientos;
