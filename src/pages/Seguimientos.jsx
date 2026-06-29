import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const matchesRespondeAFilter = (idRespondeA, filterValue, respondeAById) => {
  if (!filterValue) return true;
  const item = respondeAById.get(String(idRespondeA));
  return normalize(item?.nombre) === normalize(filterValue);
};

const matchesTipoDependenciaFilter = (
  idTipoDependencia,
  filterValue,
  tipoDependenciaById,
) => {
  if (!filterValue) return true;
  const item = tipoDependenciaById.get(String(idTipoDependencia));
  return normalize(item?.tipo) === normalize(filterValue);
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
  const [selectedTipoDependencia, setSelectedTipoDependencia] = useState("");
  const [selectedDesafio, setSelectedDesafio] = useState("");
  const [selectedRespondeA, setSelectedRespondeA] = useState("");
  const [selectedConvergente, setSelectedConvergente] = useState("");
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [selectedPrograma, setSelectedPrograma] = useState("");
  const [selectedResultado, setSelectedResultado] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );
  const tipoDependenciaById = useMemo(
    () => new Map(dependencias.map((item) => [String(item.id), item])),
    [dependencias],
  );
  const respondeAs = useMemo(
    () => sortById(getSheet(data, "RESPONDE_A")),
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
  const respondeAById = useMemo(
    () => new Map(respondeAs.map((item) => [String(item.id), item])),
    [respondeAs],
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
        selectedTipoDependencia &&
        !matchesTipoDependenciaFilter(
          indicator.id_dependencia,
          selectedTipoDependencia,
          tipoDependenciaById,
        )
      ) {
        return false;
      }
      if (
        !matchesRespondeAFilter(
          indicator.id_responde_a,
          selectedRespondeA,
          respondeAById,
        )
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
      return true;
    });
  }, [
    indicators,
    canSeeAll,
    userDependencyId,
    selectedDependency,
    selectedTipoDependencia,
    selectedDesafio,
    selectedRespondeA,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
    respondeAById,
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

  const desafioOptions = useMemo(() => {
    const ids = new Set(
      filterableIndicators.map((item) => String(item.id_desafio || "")),
    );
    return desafios.filter((item) => ids.has(String(item.id)));
  }, [desafios, filterableIndicators]);

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

  const clearFilters = () => {
    setSelectedDependency(canSeeAll ? "" : userDependencyId);
    setSelectedDesafio("");
    setSelectedRespondeA("");
    setSelectedTipoDependencia("");
    setSelectedConvergente("");
    setSelectedFacultad("");
    setSelectedPrograma("");
    setSelectedResultado("");
  };

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
    // Crear documento PDF
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Configurar fuente
    doc.setFont("helvetica");

    // Título principal
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("Reporte de Seguimientos", pageWidth / 2, 20, { align: "center" });

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 25, pageWidth - 20, 25);

    // Información de filtros y fecha
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    let yPosition = 35;

    // Fecha de actualización
    doc.text(`Fecha de actualización: ${getHeaderDate()}`, 20, yPosition);
    yPosition += 6;

    // Hora de generación del reporte
    doc.text(`Hora de generación: ${getCurrentTime()}`, 20, yPosition);
    yPosition += 6;

    // Construir cadena de filtros
    const filtros = [];

    // Obtener nombres de los filtros seleccionados
    const depName = selectedDependency
      ? dependencyOptions.find((d) => String(d.id) === selectedDependency)
          ?.nombre || selectedDependency
      : "Todos";
    filtros.push(`Dependencia: ${depName}`);

    const desafioName = selectedDesafio
      ? desafios.find((d) => String(d.id) === selectedDesafio)?.titulo ||
        selectedDesafio
      : "Todos";
    filtros.push(`Desafío: ${desafioName}`);

    const respondeAName = selectedRespondeA || "Todas";
    filtros.push(`Responde a: ${respondeAName}`);

    const tipoDependenciaName = selectedTipoDependencia
      ? tipoDependenciaById.get(String(selectedTipoDependencia))?.tipo ||
        selectedTipoDependencia
      : "Todos";
    filtros.push(`Tipo de dependencia: ${tipoDependenciaName}`);

    const convName = selectedConvergente
      ? estrategiasConvergentes.find(
          (d) => String(d.id) === selectedConvergente,
        )?.titulo || selectedConvergente
      : "Todas";
    filtros.push(`Estrategia Convergente: ${convName}`);

    const facName = selectedFacultad
      ? estrategiasFacultad.find((d) => String(d.id) === selectedFacultad)
          ?.titulo || selectedFacultad
      : "Todas";
    filtros.push(`Estrategia Facultad: ${facName}`);

    const progName = selectedPrograma
      ? programasInstitucionales.find((d) => String(d.id) === selectedPrograma)
          ?.titulo || selectedPrograma
      : "Todos";
    filtros.push(`Programa Institucional: ${progName}`);

    const resName = selectedResultado
      ? indicadoresResultado.find((d) => String(d.id) === selectedResultado)
          ?.nombre || selectedResultado
      : "Todos";
    filtros.push(`Indicador Resultado: ${resName}`);

    // Mostrar filtros en una línea o varias si es necesario
    const filtrosText = `Filtros: ${filtros.join(", ")}`;
    const splitText = doc.splitTextToSize(filtrosText, pageWidth - 40);
    splitText.forEach((line, index) => {
      doc.text(line, 20, yPosition + index * 5);
    });
    yPosition += splitText.length * 5 + 5;

    // Línea separadora después de filtros
    doc.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
    yPosition += 5;

    // Tabla de indicadores
    const tableData = [];

    rowsByDesafio.forEach((group) => {
      group.indicators.forEach((indicator, index) => {
        tableData.push([
          index === 0 ? toText(group.desafio.titulo) : "",
          toText(indicator.nombre),
          formatPercent(indicator.metaValue),
          indicator.avanceValue,
        ]);
      });
    });

    // Agregar filas de totales
    tableData.push([
      "",
      "Total porcentaje ejecutado",
      "",
      `${totals.promedio.toFixed(1).replace(".", ",")}%`,
    ]);

    tableData.push([
      "",
      "Pendiente por ejecutar",
      "",
      `${totals.pending.toFixed(1).replace(".", ",")}%`,
    ]);

    // Crear tabla
    autoTable(doc, {
      startY: yPosition,
      head: [
        ["Desafío", "Nombre Indicador", "Meta Planeada", "Meta Ejecutada"],
      ],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
      // Colorear celdas de porcentaje
      didDrawCell: function (data) {
        if (data.column.index === 3 && data.row.index < tableData.length - 3) {
          const value = data.cell.raw;
          if (value && value !== "") {
            const cleanValue = String(value)
              .replace("%", "")
              .replace(",", ".")
              .trim();
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue)) {
              let color;
              if (numValue >= 90)
                color = [144, 238, 144]; // lightgreen
              else if (numValue >= 50)
                color = [173, 216, 230]; // lightblue
              else if (numValue >= 30)
                color = [255, 255, 0]; // yellow
              else if (numValue >= 0) color = [250, 128, 114]; // salmon
              if (color) {
                doc.setFillColor(color[0], color[1], color[2]);
                doc.rect(
                  data.cell.x,
                  data.cell.y,
                  data.cell.width,
                  data.cell.height,
                  "F",
                );
                // Redibujar texto
                doc.setTextColor(0, 0, 0);
                const textX = data.cell.x + data.cell.width / 2;
                const textY = data.cell.y + data.cell.height / 2 + 2;
                doc.text(data.cell.raw, textX, textY, { align: "center" });
              }
            }
          }
        }
      },
    });

    // Agregar página para resumen si es necesario
    const lastY = doc.lastAutoTable?.finalY || yPosition;
    if (lastY + 60 > doc.internal.pageSize.height) {
      doc.addPage();
    }

    // Resumen
    const summaryY = lastY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumen", 20, summaryY);

    // Tabla de resumen
    const summaryData = [
      ["Total indicadores", filterableIndicators.length.toString()],
      ...challengeCounts.map((item) => [
        toText(item.desafio.titulo),
        item.count.toString(),
      ]),
    ];

    const summaryStartY = summaryY + 5;
    autoTable(doc, {
      startY: summaryStartY,
      head: [["Concepto", "Cantidad"]],
      body: summaryData,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
    });

    // Contador de indicadores por color
    const colorStartY = doc.lastAutoTable?.finalY + 10 || summaryStartY + 30;
    doc.setFontSize(12);
    doc.text(
      "Contador de indicadores y significado de colores",
      20,
      colorStartY,
    );

    const colorData = [
      [
        "Mayores de 90%",
        indicatorColorCounts.superior.toString(),
        "Verde claro",
      ],
      ["Entre 50% y 89%", indicatorColorCounts.alto.toString(), "Azul claro"],
      ["Entre 30% y 49%", indicatorColorCounts.medio.toString(), "Amarillo"],
      ["Entre 0% y 29%", indicatorColorCounts.bajo.toString(), "Salmon"],
    ];

    autoTable(doc, {
      startY: colorStartY + 5,
      head: [["Rango", "Cantidad", "Color"]],
      body: colorData,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      didDrawCell: function (data) {
        // Colorear celdas de "Color"
        if (data.column.index === 2 && data.row.index < colorData.length) {
          const colorName = data.cell.raw.toLowerCase();
          let bgColor;
          if (colorName.includes("verde")) bgColor = [144, 238, 144];
          else if (colorName.includes("azul")) bgColor = [173, 216, 230];
          else if (colorName.includes("amarillo")) bgColor = [255, 255, 0];
          else if (colorName.includes("salmon")) bgColor = [250, 128, 114];

          if (bgColor) {
            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              "F",
            );
            // Redibujar texto
            doc.setTextColor(0, 0, 0);
            const textX = data.cell.x + data.cell.width / 2;
            const textY = data.cell.y + data.cell.height / 2 + 2;
            doc.text(data.cell.raw, textX, textY, { align: "center" });
          }
        }
      },
    });

    // Guardar PDF
    doc.save(`seguimientos_${getHeaderDate().replace(/\//g, "_")}.pdf`);
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

          <FormControl size="small" sx={{ minWidth: 120 }}>
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

          <FormControl size="small" sx={{ minWidth: 150 }}>
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
          <Button variant="outlined" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <Button
            variant={advancedFiltersOpen ? "contained" : "outlined"}
            onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
          >
            {advancedFiltersOpen ? "Ocultar filtros" : "Ver más filtros"}
          </Button>
          <Button variant="contained" onClick={exportToPdf}>
            Exportar a pdf
          </Button>
        </Box>

        <Box className="seguimientos-responde-a-row"></Box>

        {advancedFiltersOpen && (
          <Box
            className="seguimientos-advanced-filters"
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
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
                {desafioOptions.map((item) => (
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
            <FormControl size="small">
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
            <FormControl size="small">
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

            <FormControl size="small">
              <Typography className="radio-group-title">
                Tipo de dependencia
              </Typography>
              <RadioGroup
                row
                value={selectedTipoDependencia}
                onChange={(e) => setSelectedTipoDependencia(e.target.value)}
              >
                <FormControlLabel
                  value=""
                  control={<Radio size="small" />}
                  label="Todas"
                />
                <FormControlLabel
                  value="Oficina"
                  control={<Radio size="small" />}
                  label="Oficina"
                />
                <FormControlLabel
                  value="Escuela"
                  control={<Radio size="small" />}
                  label="Escuela"
                />
              </RadioGroup>
            </FormControl>
            <FormControl className="filter-radio-group-block">
              <Typography className="radio-group-title">Responde a</Typography>
              <RadioGroup
                row
                value={selectedRespondeA}
                onChange={(e) => setSelectedRespondeA(e.target.value)}
              >
                <FormControlLabel
                  value=""
                  control={<Radio size="small" />}
                  label="Todas"
                />
                <FormControlLabel
                  value="MT"
                  control={<Radio size="small" />}
                  label="MT"
                />
                <FormControlLabel
                  value="CNA"
                  control={<Radio size="small" />}
                  label="CNA"
                />
              </RadioGroup>
            </FormControl>
          </Box>
        )}
      </Paper>

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
