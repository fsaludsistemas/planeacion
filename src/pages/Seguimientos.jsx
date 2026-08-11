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
const toTextOrBlank = (value) => String(value ?? "").trim();
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

const formatRawValue = (value, fallback = "Sin registro") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const parseSheetNumber = (value) => {
  if (value == "Sin registro") return "Sin registro";
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatExecutionPercent = (plannedValue, executedValue) => {
  const planned = parseSheetNumber(plannedValue);
  const executed = parseSheetNumber(executedValue);
  if (planned === null || executed === null || planned === 0)
    return "Sin registro";
  return `${((executed / planned) * 100).toFixed(1).replace(".", ",")}%`;
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
  const convergenteById = useMemo(() => new Map(estrategiasConvergentes.map((item) => [String(item.id), item])),
    [estrategiasConvergentes],
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

  const matchesFilter = (indicator, field, value) => {
    if (!value) return true;
    switch (field) {
      case "dependency":
        return String(indicator.id_dependencia || "") === value;
      case "tipoDependencia":
        return matchesTipoDependenciaFilter(
          indicator.id_dependencia,
          value,
          tipoDependenciaById,
        );
      case "respondeA":
        return matchesRespondeAFilter(
          indicator.id_responde_a,
          value,
          respondeAById,
        );
      case "desafio":
        return String(indicator.id_desafio || "") === value;
      case "convergente":
        return String(indicator.id_estrategia_convergente || "") === value;
      case "facultad":
        return String(indicator.id_estrategia_facultad || "") === value;
      case "programa":
        return String(indicator.id_programa_inst || "") === value;
      case "resultado":
        return String(indicator.id_indicador_resultado || "") === value;
      default:
        return true;
    }
  };

  const getIndicatorsExcept = (excludeField) => {
    return indicators.filter((indicator) => {
      if (!canSeeAll && userDependencyId) {
        if (String(indicator.id_dependencia || "") !== userDependencyId) {
          return false;
        }
      }
      const filterValues = {
        dependency: selectedDependency,
        tipoDependencia: selectedTipoDependencia,
        respondeA: selectedRespondeA,
        desafio: selectedDesafio,
        convergente: selectedConvergente,
        facultad: selectedFacultad,
        programa: selectedPrograma,
        resultado: selectedResultado,
      };
      for (const [field, value] of Object.entries(filterValues)) {
        if (field === excludeField) continue;
        if (!matchesFilter(indicator, field, value)) {
          return false;
        }
      }
      return true;
    });
  };

  const filterableIndicators = useMemo(() => {
    return getIndicatorsExcept(null);
  }, [
    indicators,
    selectedDependency,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedDesafio,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
    canSeeAll,
    userDependencyId,
  ]);

  const rowsByDesafio = useMemo(() => {
    const grouped = new Map();
    filterableIndicators.forEach((indicator) => {
      const desafio = desafioById.get(String(indicator.id_desafio || ""));
      const dependency = tipoDependenciaById.get(
        String(indicator.id_dependencia || ""),
      );
      const convergente = convergenteById.get(String(indicator.id_estrategia_convergente || ""));
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

      const normalizedName = normalize(indicator.nombre);
      const existingInd = existing.indicators.find(
        (i) => normalize(i.nombre) === normalizedName
      );

      if (existingInd) {
        const getSafeNumber = (val) => {
          const parsed = parseSheetNumber(val);
          return typeof parsed === "number" ? parsed : 0;
        };

        const sumMeta = getSafeNumber(existingInd.metaValue) + getSafeNumber(metaValue);
        const sumAvance = getSafeNumber(existingInd.avanceValue) + getSafeNumber(avanceValue);

        existingInd.metaValue = sumMeta;
        existingInd.avanceValue = sumAvance;
        existingInd.executionPercent = formatExecutionPercent(sumMeta, sumAvance);

        if (dependency?.nombre) {
          const depName = dependency.nombre;
          existingInd.dependencyCounts.set(
            depName,
            (existingInd.dependencyCounts.get(depName) || 0) + 1
          );
        }
      } else {
        const depCounts = new Map();
        if (dependency?.nombre) {
          depCounts.set(dependency.nombre, 1);
        }
        existing.indicators.push({
          ...indicator,
          dependencyCounts: depCounts,
          convergenteName: convergente?.titulo,
          metaValue,
          avanceValue,
          executionPercent: formatExecutionPercent(metaValue, avanceValue),
        });
      }

      grouped.set(String(desafio.id), existing);
    });
    return [...grouped.values()];
  }, [
    filterableIndicators,
    desafioById,
    tipoDependenciaById,
    convergenteById,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
  ]);

  const dependencyOptions = useMemo(() => {
    const rows = getIndicatorsExcept("dependency");
    const ids = new Set(rows.map((item) => String(item.id_dependencia || "")));
    return dependencias.filter((item) => ids.has(String(item.id)));
  }, [
    dependencias,
    indicators,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedDesafio,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
    canSeeAll,
    userDependencyId,
  ]);

  const desafioOptions = useMemo(() => {
    const rows = getIndicatorsExcept("desafio");
    const ids = new Set(rows.map((item) => String(item.id_desafio || "")));
    return desafios.filter((item) => ids.has(String(item.id)));
  }, [
    desafios,
    indicators,
    selectedDependency,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
    canSeeAll,
    userDependencyId,
  ]);

  const convergenteOptions = useMemo(() => {
    const rows = getIndicatorsExcept("convergente");
    const ids = new Set(
      rows.map((item) => String(item.id_estrategia_convergente || "")),
    );
    return estrategiasConvergentes.filter((item) => ids.has(String(item.id)));
  }, [
    estrategiasConvergentes,
    indicators,
    selectedDependency,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedDesafio,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
    canSeeAll,
    userDependencyId,
  ]);

  const facultadOptions = useMemo(() => {
    const rows = getIndicatorsExcept("facultad");
    const ids = new Set(
      rows.map((item) => String(item.id_estrategia_facultad || "")),
    );
    return estrategiasFacultad.filter((item) => ids.has(String(item.id)));
  }, [
    estrategiasFacultad,
    indicators,
    selectedDependency,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedDesafio,
    selectedConvergente,
    selectedPrograma,
    selectedResultado,
    canSeeAll,
    userDependencyId,
  ]);

  const programaOptions = useMemo(() => {
    const rows = getIndicatorsExcept("programa");
    const ids = new Set(
      rows.map((item) => String(item.id_programa_inst || "")),
    );
    return programasInstitucionales.filter((item) => ids.has(String(item.id)));
  }, [
    programasInstitucionales,
    indicators,
    selectedDependency,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedDesafio,
    selectedConvergente,
    selectedFacultad,
    selectedResultado,
    canSeeAll,
    userDependencyId,
  ]);

  const resultadoOptions = useMemo(() => {
    const rows = getIndicatorsExcept("resultado");
    const ids = new Set(
      rows.map((item) => String(item.id_indicador_resultado || "")),
    );
    return indicadoresResultado.filter((item) => ids.has(String(item.id)));
  }, [
    indicadoresResultado,
    indicators,
    selectedDependency,
    selectedTipoDependencia,
    selectedRespondeA,
    selectedDesafio,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    canSeeAll,
    userDependencyId,
  ]);

  // Clear incompatible filter values when options change
  useEffect(() => {
    if (
      selectedDependency &&
      !dependencyOptions.some((d) => String(d.id) === selectedDependency)
    ) {
      setSelectedDependency("");
    }
    if (
      selectedDesafio &&
      !desafioOptions.some((d) => String(d.id) === selectedDesafio)
    ) {
      setSelectedDesafio("");
    }
    if (
      selectedConvergente &&
      !convergenteOptions.some((d) => String(d.id) === selectedConvergente)
    ) {
      setSelectedConvergente("");
    }
    if (
      selectedFacultad &&
      !facultadOptions.some((d) => String(d.id) === selectedFacultad)
    ) {
      setSelectedFacultad("");
    }
    if (
      selectedPrograma &&
      !programaOptions.some((d) => String(d.id) === selectedPrograma)
    ) {
      setSelectedPrograma("");
    }
    if (
      selectedResultado &&
      !resultadoOptions.some((d) => String(d.id) === selectedResultado)
    ) {
      setSelectedResultado("");
    }
  }, [
    dependencyOptions,
    desafioOptions,
    convergenteOptions,
    facultadOptions,
    programaOptions,
    resultadoOptions,
    selectedDependency,
    selectedDesafio,
    selectedConvergente,
    selectedFacultad,
    selectedPrograma,
    selectedResultado,
  ]);

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
    let totalIndicadoresValidos = 0;
    let totalIndicadoresGeneral = 0;
    let totalEjecutados = 0;

    const executed = rowsByDesafio.reduce((sum, group) => {
      totalIndicadoresGeneral += group.indicators.length;
      return (
        sum +
        group.indicators.reduce((inner, indicator) => {
          const numero = parseSheetNumber(indicator.executionPercent);
          if (typeof numero !== "number") return inner;
          totalIndicadoresValidos++;
          if (numero >= 90) totalEjecutados++;
          return inner + numero;
        }, 0)
      );
    }, 0);

    const promedio = totalIndicadoresValidos ? executed / totalIndicadoresValidos : 0;
    const pendingPorcentaje = Math.max(0, 100 - promedio);

    const sinRegistroCount = totalIndicadoresGeneral - totalIndicadoresValidos;
    const sinRegistro = totalIndicadoresGeneral ? (sinRegistroCount / totalIndicadoresGeneral) * 100 : 0;
    const pesoValidos = totalIndicadoresGeneral ? (totalIndicadoresValidos / totalIndicadoresGeneral) : 0;

    return {
      promedio,
      pending: pendingPorcentaje,
      numEjecutados: totalEjecutados,
      totalIndicadores: totalIndicadoresGeneral,
      porcentajeCumplimiento: totalIndicadoresGeneral ? (totalEjecutados / totalIndicadoresGeneral) * 100 : 0,
      chartData: {
        ejecutado: promedio * pesoValidos,
        pendiente: pendingPorcentaje * pesoValidos,
        sinRegistro: sinRegistro,
      },
    };
  }, [rowsByDesafio]);

  // challengeCounts: si hay filtro de dependencia se cuentan todos los indicadores del grupo,
  // si no hay filtro se cuentan solo los indicadores únicos (por nombre normalizado).
  // Los desafíos se ordenan por id numérico.
  const challengeCounts = useMemo(() => {
    const sorted = [...rowsByDesafio].sort(
      (a, b) => Number(a.desafio.id ?? 0) - Number(b.desafio.id ?? 0)
    );
    return sorted.map((group) => ({
      desafio: group.desafio,
      count: group.indicators.length,
    }));
  }, [rowsByDesafio]);

  const indicatorColorCounts = useMemo(() => {
    return filterableIndicators.reduce(
      (acc, indicator) => {
        const meta = metaByIndicatorId.get(String(indicator.id));
        const avance = avanceByIndicatorId.get(String(indicator.id));
        const value = parseSheetNumber(
          formatExecutionPercent(
            meta ? meta[`meta_${selectedYear}`] : null,
            avance ? avance[`avance_${selectedYear}`] : null,
          ),
        );
        if (value === null) return acc;
        if (value >= 90) acc.superior += 1;
        else if (value >= 50) acc.alto += 1;
        else if (value >= 30) acc.medio += 1;
        else if (value >= 0) acc.bajo += 1;
        else if (
          value == "Sin registro" ||
          value === "sin registro" ||
          value === "" ||
          value === null
        )
          acc.sinRegistro += 1;
        return acc;
      },
      { superior: 0, alto: 0, medio: 0, bajo: 0, sinRegistro: 0 },
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
          toTextOrBlank(indicator.convergenteName),
          toTextOrBlank(indicator.dependencyName),
          formatRawValue(indicator.metaValue),
          formatRawValue(indicator.avanceValue),
          indicator.executionPercent,
        ]);
      });
    });

    // Agregar filas de totales
    tableData.push([
      "",
      "",
      "Total porcentaje ejecutado",
      "",
      "",
      `${totals.promedio.toFixed(1).replace(".", ",")}%`,
    ]);

    tableData.push([
      "",
      "",
      "Pendiente por ejecutar",
      "",
      "",
      `${totals.pending.toFixed(1).replace(".", ",")}%`,
    ]);

    // Crear tabla
    autoTable(doc, {
      startY: yPosition,
      head: [
        [
          "Desafío",
          "Nombre Indicador",
          "Dependencia",
          "Meta Planeada",
          "Meta Ejecutada",
          "Porcentaje ejecutado",
        ],
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
        2: { cellWidth: "auto" },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 28 },
      },
      // Colorear celdas de porcentaje
      didDrawCell: function (data) {
        if (data.column.index === 5 && data.row.index < tableData.length - 3) {
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
    let lastY = doc.lastAutoTable?.finalY || yPosition;
    if (lastY + 50 > doc.internal.pageSize.height) {
      doc.addPage();
      lastY = 15;
    }

    // Resumen
    const summaryY = lastY + 10;
    doc.setFontSize(12);
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

    const summaryStartY = summaryY + 4;
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

    let currentY = doc.lastAutoTable?.finalY + 10;

    // Verificar si el gráfico de torta + la tabla de colores caben, de lo contrario agregar página
    if (currentY + 95 > doc.internal.pageSize.height) {
      doc.addPage();
      currentY = 20;
    }

    // Dibujar título del gráfico de torta
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Cumplimiento General", 20, currentY);
    currentY += 5;

    // Generar gráfico de torta en canvas
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 200);

    const cx = 100;
    const cy = 100;
    const radius = 80;
    
    const ejecutado = totals.chartData?.ejecutado || 0;
    const pendiente = totals.chartData?.pendiente || 0;
    const sinRegistro = totals.chartData?.sinRegistro || 0;
    
    const executedAngle = (ejecutado / 100) * 2 * Math.PI;
    const pendingAngle = (pendiente / 100) * 2 * Math.PI;
    const sinRegistroAngle = (sinRegistro / 100) * 2 * Math.PI;

    let currentAngle = -Math.PI / 2;

    // Porcentaje ejecutado (verde)
    if (ejecutado > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, currentAngle, currentAngle + executedAngle);
      ctx.closePath();
      ctx.fillStyle = "#4CAF50";
      ctx.fill();
      currentAngle += executedAngle;
    }

    // Porcentaje pendiente (rojo)
    if (pendiente > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, currentAngle, currentAngle + pendingAngle);
      ctx.closePath();
      ctx.fillStyle = "#F44336";
      ctx.fill();
      currentAngle += pendingAngle;
    }

    // Porcentaje sin registro (gris)
    if (sinRegistro > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, currentAngle, currentAngle + sinRegistroAngle);
      ctx.closePath();
      ctx.fillStyle = "#9E9E9E";
      ctx.fill();
      currentAngle += sinRegistroAngle;
    }

    // Líneas divisorias blancas (simples)
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    let lineAngle = -Math.PI / 2;
    [executedAngle, pendingAngle, sinRegistroAngle].forEach(angle => {
      if (angle > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + radius * Math.cos(lineAngle),
          cy + radius * Math.sin(lineAngle),
        );
        ctx.stroke();
        lineAngle += angle;
      }
    });

    // Leyenda
    const lx = 220;
    let ly = 60;

    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(lx, ly, 15, 15);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(
      `Ejecutado (${ejecutado.toFixed(1).replace(".", ",")}%)`,
      lx + 22,
      ly + 12,
    );

    ly += 25;
    ctx.fillStyle = "#F44336";
    ctx.fillRect(lx, ly, 15, 15);
    ctx.fillStyle = "#000000";
    ctx.fillText(
      `Pendiente (${pendiente.toFixed(1).replace(".", ",")}%)`,
      lx + 22,
      ly + 12,
    );
    
    ly += 25;
    ctx.fillStyle = "#9E9E9E";
    ctx.fillRect(lx, ly, 15, 15);
    ctx.fillStyle = "#000000";
    ctx.fillText(
      `Sin registro (${sinRegistro.toFixed(1).replace(".", ",")}%)`,
      lx + 22,
      ly + 12,
    );

    const chartImgData = canvas.toDataURL("image/png");
    doc.addImage(chartImgData, "PNG", 20, currentY, 100, 50);
    currentY += 55;

    // Contador de indicadores por color
    doc.setFontSize(12);
    doc.text("Contador de indicadores y significado de colores", 20, currentY);

    const colorData = [
      [
        "Mayores de 90%",
        indicatorColorCounts.superior.toString(),
        "Verde claro",
      ],
      ["Entre 50% y 89%", indicatorColorCounts.alto.toString(), "Azul claro"],
      ["Entre 30% y 49%", indicatorColorCounts.medio.toString(), "Amarillo"],
      ["Entre 0% y 29%", indicatorColorCounts.bajo.toString(), "Salmon"],
      ["Sin registro", indicatorColorCounts.sinRegistro.toString(), "Black"],
    ];

    autoTable(doc, {
      startY: currentY + 4,
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
        if (data.column.index === 2 && data.row.index < colorData.length) {
          const colorName = data.cell.raw.toLowerCase();
          let bgColor;
          if (colorName.includes("verde")) bgColor = [144, 238, 144];
          else if (colorName.includes("azul")) bgColor = [173, 216, 230];
          else if (colorName.includes("amarillo")) bgColor = [255, 255, 0];
          else if (colorName.includes("salmon")) bgColor = [250, 128, 114];
          else if (colorName.includes("black")) bgColor = [0, 0, 0];
          if (bgColor) {
            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              "F",
            );
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
                <FormControlLabel
                  value="DEP"
                  control={<Radio size="small" />}
                  label="DEP"
                />
              </RadioGroup>
            </FormControl>
          </Box>
        )}
      </Paper>

      {/* Resumen horizontal - antes de la tabla */}
      <Paper className="seguimientos-summary-horizontal" elevation={1}>
        <Box className="seguimientos-summary-inner">
          {/* Tabla de resumen */}
          <Box className="seguimientos-summary-section seguimientos-summary-resumen">
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
                    <TableCell sx={{ fontWeight: 800 }}>Total indicadores</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{filterableIndicators.length}</TableCell>
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
          </Box>

          <Box className="seguimientos-summary-right">
            <Box className="seguimientos-summary-charts-row">
              {/* Gráfico de torta */}
              <Box className="seguimientos-summary-section seguimientos-summary-chart">
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  Cumplimiento General
                </Typography>
                <PieChart
                  series={[
                    {
                      data: [
                        {
                          id: 0,
                          value: totals.chartData?.ejecutado || 0,
                          label: "Ejecutado",
                          color: "green",
                        },
                        {
                          id: 1,
                          value: totals.chartData?.pendiente || 0,
                          label: "Pendiente",
                          color: "red",
                        },
                        {
                          id: 2,
                          value: totals.chartData?.sinRegistro || 0,
                          label: "Sin registro",
                          color: "grey",
                        },
                      ],
                    },
                  ]}
                  width={290}
                  height={220}
                  margin={{ bottom: 60 }}
                  slotProps={{
                    legend: {
                      direction: "row",
                      position: { vertical: "bottom", horizontal: "middle" },
                      padding: 0,
                      labelStyle: { fontSize: 11 },
                    },
                  }}
                />
              </Box>

              {/* Contador de colores */}
              <Box className="seguimientos-summary-section">
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  Indicadores por color
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}>
                          Mayores de 90%
                        </TableCell>
                        <TableCell sx={{ backgroundColor: "lightgreen" }}>
                          {indicatorColorCounts.superior}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}>
                          Entre 50% y 89%
                        </TableCell>
                        <TableCell sx={{ backgroundColor: "lightblue" }}>
                          {indicatorColorCounts.alto}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}>
                          Entre 30% y 49%
                        </TableCell>
                        <TableCell sx={{ backgroundColor: "yellow" }}>
                          {indicatorColorCounts.medio}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}>
                          Entre 0% y 29%
                        </TableCell>
                        <TableCell sx={{ backgroundColor: "salmon" }}>
                          {indicatorColorCounts.bajo}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, backgroundColor: "#f5f5f5" }}>
                          Sin registro
                        </TableCell>
                        <TableCell sx={{ backgroundColor: "grey" }}>
                          {indicatorColorCounts.sinRegistro}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            <Box className="seguimientos-stats-cards">
              <Paper className="seguimientos-stat-card" elevation={0}>
                <Typography className="seguimientos-stat-label">
                  Indicadores ejecutados
                </Typography>
                <Typography className="seguimientos-stat-value">
                  {totals.numEjecutados}
                </Typography>
              </Paper>
              <Paper className="seguimientos-stat-card" elevation={0}>
                <Typography className="seguimientos-stat-label">
                  Porcentaje de cumplimiento
                </Typography>
                <Typography className="seguimientos-stat-value">
                  {totals.porcentajeCumplimiento.toFixed(1).replace(".", ",")}%
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tabla de indicadores agrupada por desafío y estrategia convergente */}
      <TableContainer component={Paper} className="seguimientos-table-card">
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Desafío</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Estrategia Convergente</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Nombre Indicador</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Dependencia</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Meta planeada</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Meta ejecutada</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Porcentaje ejecutado</TableCell>
            </TableRow>
            {rowsByDesafio.map((group) => {
              // Agrupar los indicadores del desafío por estrategia convergente
              const convergenteGroups = [];
              const convergenteMap = new Map();
              group.indicators.forEach((indicator) => {
                const key = toTextOrBlank(indicator.convergenteName) || "(Sin estrategia convergente)";
                if (!convergenteMap.has(key)) {
                  convergenteMap.set(key, []);
                  convergenteGroups.push(key);
                }
                convergenteMap.get(key).push(indicator);
              });

              const totalIndicatorsInDesafio = group.indicators.length;

              return convergenteGroups.map((convKey, convIndex) => {
                const convIndicators = convergenteMap.get(convKey);
                return convIndicators.map((indicator, indIndex) => (
                  <TableRow key={`${group.desafio.id}-${convKey}-${indicator.id}`}>
                    {/* Celda de desafío: rowSpan total de todos los indicadores del desafío, solo en la primera fila */}
                    {convIndex === 0 && indIndex === 0 && (
                      <TableCell
                        rowSpan={totalIndicatorsInDesafio}
                        sx={{ fontWeight: 700}}
                      >
                        {toText(group.desafio.titulo)}
                      </TableCell>
                    )}
                    {/* Celda de estrategia convergente: rowSpan de los indicadores de ese convergente */}
                    {indIndex === 0 && (
                      <TableCell
                        rowSpan={convIndicators.length}
                        sx={{ fontWeight: 600, fontStyle: convKey === "(Sin estrategia convergente)" ? "italic" : "normal" }}
                      >
                        {convKey}
                      </TableCell>
                    )}
                    <TableCell>{toText(indicator.nombre)}</TableCell>
                    <TableCell>
                      {(() => {
                        const counts = indicator.dependencyCounts;
                        if (!counts || counts.size === 0) return "";
                        return [...counts.entries()]
                          .map(([name, count]) => `${name} (${count})`)
                          .join(", ");
                      })()}
                    </TableCell>
                    <TableCell>{formatRawValue(indicator.metaValue)}</TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: percentageClass(indicator.executionPercent),
                      }}
                    >
                      {formatRawValue(indicator.avanceValue)}
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: percentageClass(indicator.executionPercent),
                      }}
                    >
                      {indicator.executionPercent}
                    </TableCell>
                  </TableRow>
                ));
              });
            })}
            <TableRow>
              <TableCell colSpan={5} sx={{ fontWeight: 800 }}>
                Total porcentaje ejecutado
              </TableCell>
              <TableCell sx={{ fontWeight: 800 }}>
                {`${totals.promedio.toFixed(1).replace(".", ",")}%`}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={5} sx={{ fontWeight: 800 }}>
                Pendiente por ejecutar
              </TableCell>
              <TableCell sx={{ fontWeight: 800 }}>
                {`${totals.pending.toFixed(1).replace(".", ",")}%`}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

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
