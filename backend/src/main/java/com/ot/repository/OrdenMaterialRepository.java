package com.ot.repository;

import com.ot.model.OrdenMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface OrdenMaterialRepository extends JpaRepository<OrdenMaterial, Long> {
    List<OrdenMaterial> findByOrdenTrabajoId(Long ordenTrabajoId);

    @Transactional
    void deleteByOrdenTrabajoId(Long ordenTrabajoId);
}
