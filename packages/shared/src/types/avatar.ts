export interface AvatarConfig {
  seed: string
  skinColor: string          // hex color
  hair: string               // variant01–variant13
  hairColor: string          // hex color
  accessories: string        // variant01–variant04 | 'none'
  accessoriesColor: string   // hex color
  clothing: string           // variant01–variant23
  clothingColor: string      // hex color
  beard: string              // variant01–variant08 | 'none'
  beardColor: string         // hex color
  eyes: string               // variant01–variant13
  eyebrows: string           // variant01–variant15
  mouth: string              // variant01–variant12
  glasses: string            // variant01–variant05 | 'none'
  glassesColor: string       // hex color
}
