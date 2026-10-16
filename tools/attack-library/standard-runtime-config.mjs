// EmulatorJS 4.2.3 iterates four controller maps even for two-player games.
export function normalizeControls(controls = {}) {
  return Object.fromEntries([0, 1, 2, 3].map(player => [player, structuredClone(controls[player] || {})]));
}
// The 4.2.3 raw external-file branch passes ArrayBuffer to FS.writeFile and can
// silently leave a zero-byte file. The directory branch extracts Uint8Arrays.
// Container holds the original BIOS ZIP unchanged; FBNeo requires that ZIP.
export function biosFiles(game, local) {
  if (!game.bios) return {};
  if (!game.biosContainer) throw new Error('缺少兼容 BIOS 容器：' + game.id);
  return { '/': local(game.biosContainer) };
}
