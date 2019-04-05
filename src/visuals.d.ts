export module rocklog {
  
  module vis {

    interface Vec3 {
      x: number
      y: number
      z: number
    }
    
    interface StorageLocation {
      id: string
      pos: Vec3
      dim: Vec3
    }
    
    interface Stock {
      id: string
      locId: string
      color?: string
    }

    interface StorageVis {
      locations: StorageLocation[]
      stocks: Stock[]
    }
  }
}
