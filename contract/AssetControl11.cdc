 pub contract AssetControl11 {
  pub let gandalfPublic: PublicPath
  pub let assetPublic: PublicPath
  pub let assetPath: StoragePath
  pub let gandalfPath: StoragePath
  pub let gandalfPrivate: PrivatePath
  pub let assetPrivate: PrivatePath
  pub let basePath: String

  pub resource interface Public {
    access(contract) var allUsersOfOrganisation: {String: [Address]}
    access(contract) var userData: {String: AnyStruct}
    access(contract) var companyData: {String: AnyStruct}
    access(contract) var companyApiKeys: {Address: String}
    pub fun getUsersOfOrganisation(_ apikey: String): [Address]?
    pub fun getCompanyData(_ apikey: String): AnyStruct
    pub fun getCompanyApikey(_ address: Address): AnyStruct
  }
  pub resource interface AssetPublic {
    access(contract) var ownerVaultData: {String: AnyStruct}
    pub var userData: {String: String}
    pub fun getUserData(): {String: String}?
    pub fun getAllVault(): {String: AnyStruct}?
    pub fun getVault(_ name: String): AnyStruct
  }
  pub resource interface Owner {
    pub fun setVaultData(_ key: String, _ value: AnyStruct)
    pub fun setUserData(_ name: String, _ email: String, _ key: String)
  }

  pub resource interface Admin {
    pub fun setCompanyData(_ apikey: String, _ name: String, _ email: String, _ address: Address)
    pub fun addUsersToOrganisation(_ apikey: String, _ address: Address)
  }

  // Define the Asset resource
  pub resource Asset: Owner, AssetPublic {
    access(contract) var ownerVaultData: {String: AnyStruct}
    pub var userData: {String: String}
    init() {
      self.ownerVaultData = {}
      self.userData = {}
    }
    pub fun getAllVault(): {String: AnyStruct}? { return self.ownerVaultData }
    pub fun getVault(_ name: String): AnyStruct { return self.ownerVaultData[name] ?? nil }
    pub fun getUserData(): {String: String}? { return self.userData }

    pub fun setVaultData(_ name: String, _ value: AnyStruct) { self.ownerVaultData[name] = value}
    pub fun setUserData(_ name: String, _ email: String, _ key: String) { 
    self.userData["name"] = name
    self.userData["email"] = email
    self.userData["key"] = key
    }

  }

  pub resource ProtocolData: Admin, Public {
    access(contract) var allUsersOfOrganisation: {String: [Address]}
    access(contract) var userData: {String: AnyStruct}
    access(contract) var companyData: {String: AnyStruct}
    access(contract) var companyApiKeys: {Address: String}
    init() {
      self.allUsersOfOrganisation = {}
      self.userData = {}
      self.companyData = {}
      self.companyApiKeys = {}
    }
    pub fun getCompanyData(_ apikey: String): AnyStruct {return self.companyData[apikey]}
    pub fun getCompanyApikey(_ address: Address): AnyStruct {return self.companyApiKeys[address]?? "No Company for this wallet address"}
    pub fun getUsersOfOrganisation(_ apikey: String): [Address]? {return self.allUsersOfOrganisation[apikey] ?? [0x01]
     }

    pub fun addUsersToOrganisation(_ apikey: String, _ address: Address) {
        if self.allUsersOfOrganisation[apikey] == nil {
            self.allUsersOfOrganisation[apikey] = [address]
        } else {
            //check if user already exists using .contains method
            if self.allUsersOfOrganisation[apikey]!.contains(address) {
                panic("User already exists")
            }
            self.allUsersOfOrganisation[apikey]!.append(address)
        }
    }
    pub fun setCompanyData(_ apikey: String, _ name: String, _ email: String, _ address: Address) {
      self.companyData[apikey] = {"name": name, "email": email, "address": address}
      self.companyApiKeys[address] = apikey
    }

  }

  pub fun new(): @AssetControl11.Asset {
    return <- create Asset()
  }

  pub fun constructAdminData(): @AssetControl11.ProtocolData {
    return <- create ProtocolData()
  }

  pub fun check(_ address: Address): Bool {
    return getAccount(address)
      .getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic)
      .check()
  }
  
  init(){
    self.assetPath = /storage/AssetControl11_asset
    self.gandalfPath = /storage/AssetControl11_gandalf
    self.gandalfPublic = /public/AssetControl11_gandalf
    self.assetPublic = /public/AssetControl11_asset
    self.assetPrivate = /private/AssetControl11_asset
    self.gandalfPrivate = /private/AssetControl11_gandalf
    self.basePath = "AssetControl11"

    //self.account.save(<- self.new(), to: self.assetPath)
    self.account.save(<- self.constructAdminData(), to: self.gandalfPath)
    self.account.link<&ProtocolData{Public}>(self.gandalfPublic, target: self.gandalfPath)
    self.account.link<&Asset{AssetPublic}>(self.assetPublic, target: self.assetPath)
    self.account.link<&Asset{Owner}>(self.assetPrivate, target: self.assetPath)
    self.account.link<&ProtocolData{Admin}>(self.gandalfPrivate, target: self.gandalfPath)
    
    //self.account.borrow<&Asset{Owner}>(from: self.assetPath)!.setVaultData("Netflix",{1:"password_netflix"})
  }
}
 