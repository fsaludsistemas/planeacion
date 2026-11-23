export const formatDependencyName = (name, tipo) => {
  if (!name) return "";
  const cleanName = String(name).trim();
  const cleanTipo = String(tipo || "").trim().toLowerCase();

  const isEscuela =
    cleanTipo.includes("escuela") ||
    /^(odontologia|ciencias basicas|medicina|bacteriologia|salud publica|rehabilitacion humana|enfermeria)$/i.test(
      cleanName,
    );

  if (isEscuela) {
    if (/^escuela(\s+de)?\b/i.test(cleanName)) {
      return cleanName;
    }
    return `Escuela de ${cleanName}`;
  }

  // Oficina o por defecto
  if (/\boficina\b/i.test(cleanName) || /\bvicedecanatura\b/i.test(cleanName)) {
    return cleanName;
  }
  return `Oficina de ${cleanName}`;
};

export const formatDependenciesList = (list) => {
  if (!Array.isArray(list)) return list;
  return list.map((dep) => ({
    ...dep,
    nombre: formatDependencyName(dep.nombre, dep.tipo),
  }));
};
